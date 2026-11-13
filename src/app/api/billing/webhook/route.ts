/**
 * PropertyPro - Stripe subscription webhook
 *
 * The ONLY thing that provisions a manager account from a self-serve purchase.
 * The browser is never trusted to say "I paid" — it only starts a Checkout
 * session; this endpoint is what Stripe tells the truth to.
 *
 * Separate from /api/stripe/webhook, which handles tenant rent payments. They
 * are different money flows with different secrets, so keep them apart: a
 * shared handler would have to guess which flow an event belongs to.
 *
 * Set STRIPE_SUBSCRIPTION_WEBHOOK_SECRET to this endpoint's signing secret.
 *
 * Stripe retries on any non-2xx, so every handler here must be idempotent —
 * hence the unique indexes on ManagerAccount.stripeSubscriptionId and
 * ManagerPayment.stripeInvoiceId, which make a double delivery collide rather
 * than silently create a second account or double-count revenue.
 */

// Aliased: the local `mongoose` in this file is a connection cache, not the
// mongoose module.
import { model as dbModel } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import connectDB from "@/lib/mongodb";
import { ManagerAccount, ManagerPayment, User } from "@/models";
import { resolvePlan } from "@/lib/billing/plans";
import { planForStripePrice } from "@/lib/billing/stripe-prices";
import {
  createPasswordResetToken,
  SEVEN_DAYS_MS,
} from "@/lib/invitation-utils";
import { emailService } from "@/lib/email-service";
import {
  claimStripeEvent,
  markStripeEventProcessed,
  releaseStripeEvent,
} from "@/lib/stripe-events";

export const dynamic = "force-dynamic";

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  );
}

/** Stripe amounts are in minor units; our records are GBP major units. */
const toMajor = (minor: number | null | undefined) => (minor ?? 0) / 100;

function periodLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Mirror a ManagerAccount's state onto the two other places that describe it:
 * the user's `subscription` field (what they are entitled to) and the
 * standalone Subscription record. The account stays the source of truth; call
 * this after every change to it so the three never drift apart.
 *
 * Past-due keeps the plan while Stripe retries the card (otherwise one declined
 * payment would instantly cut off a paying customer); cancelled, expired and
 * still-pending accounts fall back to `free`.
 *
 * Best-effort: the payment itself is already recorded, so a failure here is
 * logged, not thrown (throwing would make Stripe retry a payment we hold).
 */
async function syncSubscriptionState(account: any) {
  const entitled =
    account.status === "active" || account.status === "past_due"
      ? account.planId
      : "free";

  if (account.managerUserId) {
    try {
      await User.updateOne(
        { _id: account.managerUserId },
        { $set: { subscription: entitled } }
      );
    } catch (error) {
      console.error(
        `[billing] failed to set user ${account.managerUserId} to "${entitled}":`,
        error
      );
    }
  }

  try {
    const set: Record<string, unknown> = {
      planId: account.planId,
      status: account.status,
      billingCycle: account.billingCycle,
      amount: account.amount,
      unitLimit: resolvePlan(account.planId)?.unitLimit ?? null,
      currentPeriodEnd: account.renewsAt ?? null,
      lastPaymentAt: account.lastPaymentAt ?? null,
      cancelAtPeriodEnd: !!account.cancelAtPeriodEnd,
      stripeCustomerId: account.stripeCustomerId ?? null,
      stripeSubscriptionId: account.stripeSubscriptionId ?? null,
      stripePriceId: account.stripePriceId ?? null,
    };
    if (account.status === "cancelled") {
      set.cancelledAt = account.updatedAt ?? new Date();
    }

    const filter = { managerAccountId: account._id, deletedAt: null };
    if (account.managerUserId) {
      // Upsert: an account created by Checkout (no prior sign-up) has no
      // Subscription record yet.
      await dbModel("Subscription").updateOne(
        filter,
        {
          $set: set,
          $setOnInsert: {
            userId: account.managerUserId,
            startedAt: account.startedAt ?? new Date(),
            paymentMethod: "card",
            currency: "GBP",
          },
        },
        { upsert: true }
      );
    } else {
      await dbModel("Subscription").updateOne(filter, { $set: set });
    }
  } catch (error) {
    console.error(
      `[billing] failed to update Subscription for account ${account._id}:`,
      error
    );
  }
}

/**
 * Provision a manager login for a paying customer. Idempotent: an existing user
 * with this email is reused rather than duplicated, which matters because
 * Stripe may deliver checkout.session.completed more than once.
 */
async function provisionManagerUser(
  email: string,
  name: string | null | undefined,
  planName: string
): Promise<{ userId: string; created: boolean }> {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return { userId: String(existing._id), created: false };

  const [firstName, ...rest] = (name || email.split("@")[0]).split(" ");

  const user = await User.create({
    email: email.toLowerCase(),
    firstName: firstName || "New",
    lastName: rest.join(" ") || "Manager",
    role: "manager",
    isActive: true,
    // No password is set here. The customer receives a set-password link;
    // inventing one and emailing it would be worse than making them choose.
    password: undefined,
  });

  const displayName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  // Seven days, not the one-hour reset default: someone who just paid may not
  // open their inbox today, and an expired link is their first impression.
  const invite = await createPasswordResetToken(
    String(user._id),
    user.email,
    SEVEN_DAYS_MS
  );

  if (invite.success && invite.token) {
    const sent = await emailService.sendManagerWelcome(
      user.email,
      displayName || user.email,
      invite.token,
      planName
    );

    if (!sent) {
      // Do NOT throw: the subscription is paid and the account exists, so
      // failing the webhook would make Stripe retry and duplicate nothing
      // useful. Log loudly enough that the link can be resent by hand.
      console.error(
        `[billing] Welcome email FAILED for ${user.email}. ` +
          `Send this link manually: ${appUrl()}/auth/reset-password?token=${invite.token}`
      );
    }
  } else {
    console.error(
      `[billing] Could not create a set-password token for ${user.email}: ${invite.error}`
    );
  }

  return { userId: String(user._id), created: true };
}

async function handleCheckoutCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  if (session.mode !== "subscription") return;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  if (!subscriptionId) return;

  // Already provisioned — a retried delivery, not a second sale.
  const existing = await ManagerAccount.findOne({
    stripeSubscriptionId: subscriptionId,
    deletedAt: null,
  });
  if (existing) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price?.id;
  const mapped = priceId ? planForStripePrice(priceId) : null;

  // "pro" as the last resort: it is the only plan sold through Checkout now
  // that starter/growth are retired (see scripts/seed-plan-roles.js).
  const planId = mapped?.planId ?? session.metadata?.planId ?? "pro";
  const cycle =
    mapped?.cycle ??
    ((session.metadata?.cycle as "monthly" | "annual") || "monthly");

  const email =
    session.customer_details?.email || session.customer_email || undefined;
  if (!email) {
    // Nothing to provision against. Fail loudly so Stripe retries rather than
    // recording a paid subscription nobody can log into.
    throw new Error(`Checkout ${session.id} completed with no customer email`);
  }

  const name = session.customer_details?.name;
  const { userId } = await provisionManagerUser(
    email,
    name,
    resolvePlan(planId)?.name ?? planId
  );

  const currentPeriodEnd = (subscription as any).current_period_end as
    | number
    | undefined;

  const paidFields = {
    contactEmail: email,
    managerUserId: userId,
    planId,
    status: "active" as const,
    amount:
      toMajor(subscription.items.data[0]?.price?.unit_amount) ||
      (cycle === "annual"
        ? (resolvePlan(planId)?.annualPrice ?? 0)
        : (resolvePlan(planId)?.monthlyPrice ?? 0)),
    billingCycle: cycle,
    startedAt: new Date(subscription.start_date * 1000),
    renewsAt: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
    paymentMethod: "card" as const,
    stripeCustomerId:
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id,
    stripeSubscriptionId: subscriptionId,
    stripePriceId: priceId,
  };

  // A self-serve sign-up has ALREADY opened a `pending` account for this user
  // (see /api/auth/register) carrying no Stripe ids. The lookup at the top of
  // this function only matches on stripeSubscriptionId, and that unique index
  // is sparse so nulls never collide — so without claiming that row here we
  // would leave it orphaned and insert a SECOND account for the same customer,
  // double-counting them on the admin billing page.
  //
  // Newest first: if a customer somehow has more than one unclaimed row, the
  // one they just signed up with is the one this payment belongs to.
  const unclaimed = await ManagerAccount.findOne({
    stripeSubscriptionId: null,
    deletedAt: null,
    // Card only. An admin-sold account is recorded as `cash`, and claiming one
    // of those would silently convert a negotiated cash arrangement into a
    // Stripe subscription and lose the record of how that client actually pays.
    paymentMethod: "card",
    $or: [{ managerUserId: userId }, { contactEmail: email.toLowerCase() }],
  }).sort({ createdAt: -1 });

  if (unclaimed) {
    unclaimed.set(paidFields);
    // Stripe does not always collect a name. Keep the one registration
    // captured rather than replacing a real name with an email address.
    if (name) unclaimed.clientName = name;
    // A concurrent duplicate delivery can reach here twice; the unique index
    // on stripeSubscriptionId makes the loser throw, the webhook returns 500,
    // and Stripe retries — by which time the check at the top matches instead.
    await unclaimed.save();
    await syncSubscriptionState(unclaimed);
    return;
  }

  const created = await ManagerAccount.create({
    ...paidFields,
    clientName: name || email,
  });
  await syncSubscriptionState(created);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId =
    typeof (invoice as any).subscription === "string"
      ? (invoice as any).subscription
      : (invoice as any).subscription?.id;
  if (!subscriptionId) return;

  const account = await ManagerAccount.findOne({
    stripeSubscriptionId: subscriptionId,
    deletedAt: null,
  });
  // The subscription's first invoice can arrive before checkout.session
  // .completed. Throwing makes Stripe retry, by which time the account exists.
  if (!account) {
    throw new Error(
      `invoice.paid for unknown subscription ${subscriptionId} — retrying`
    );
  }

  const receivedOn = new Date(
    (invoice.status_transitions?.paid_at ?? invoice.created) * 1000
  );

  try {
    await ManagerPayment.create({
      accountId: account._id,
      clientName: account.clientName,
      companyName: account.companyName,
      planId: account.planId,
      amount: toMajor(invoice.amount_paid),
      receivedOn,
      method: "card",
      recordedBy: "Stripe",
      periodLabel: periodLabel(receivedOn),
      stripeInvoiceId: invoice.id,
    });
  } catch (error: any) {
    // Unique index on stripeInvoiceId: an earlier delivery already wrote this
    // payment. That is NOT a reason to stop — it may have died before updating
    // the account below — so carry on; everything after this is idempotent.
    if (error?.code !== 11000) throw error;
  }

  // A late or replayed invoice must not undo a cancellation: a customer who
  // re-subscribes gets a new Stripe subscription (and so a new account).
  if (account.status === "cancelled" || account.status === "expired") {
    console.warn(
      `[billing] invoice ${invoice.id} paid on ${account.status} account ${account._id}; payment recorded, account left as is`
    );
    return;
  }

  // Only ever move forward in time, so an older invoice delivered late cannot
  // roll the dates back.
  if (!account.lastPaymentAt || receivedOn > account.lastPaymentAt) {
    account.lastPaymentAt = receivedOn;
  }
  account.status = "active";
  const periodEnd = (invoice as any).period_end as number | undefined;
  if (periodEnd) {
    const next = new Date(periodEnd * 1000);
    if (!account.renewsAt || next > account.renewsAt) account.renewsAt = next;
  }
  await account.save();
  await syncSubscriptionState(account);
}

async function handleSubscriptionChanged(
  stripe: Stripe,
  eventSubscription: Stripe.Subscription
) {
  const account = await ManagerAccount.findOne({
    stripeSubscriptionId: eventSubscription.id,
    deletedAt: null,
  });
  if (!account) return;

  // Events can arrive out of order, so the payload may describe an older state
  // than Stripe now holds. Re-read the subscription and act on the current one.
  let subscription: Stripe.Subscription;
  try {
    subscription = await stripe.subscriptions.retrieve(eventSubscription.id);
  } catch (error: any) {
    if (error?.code === "resource_missing") return;
    throw error; // anything else: 500 so Stripe retries
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const mapped = priceId ? planForStripePrice(priceId) : null;

  if (mapped) {
    account.planId = mapped.planId;
    account.billingCycle = mapped.cycle;
  }
  if (priceId) account.stripePriceId = priceId;

  const unitAmount = subscription.items.data[0]?.price?.unit_amount;
  if (unitAmount != null) account.amount = toMajor(unitAmount);

  // Stripe's status is authoritative — ours is a mirror, never a second opinion.
  switch (subscription.status) {
    case "active":
    case "trialing":
      account.status = "active";
      break;
    case "past_due":
    case "unpaid":
      account.status = "past_due";
      break;
    case "canceled":
      account.status = "cancelled";
      break;
    case "incomplete":
    case "incomplete_expired":
      account.status = "pending";
      break;
    default:
      // e.g. "paused": not something we sell. Leave the status alone and say so.
      console.warn(
        `[billing] subscription ${subscription.id} has unhandled status "${subscription.status}"; account status unchanged`
      );
  }

  account.cancelAtPeriodEnd = subscription.cancel_at_period_end ?? false;

  const currentPeriodEnd = (subscription as any).current_period_end as
    | number
    | undefined;
  if (currentPeriodEnd) account.renewsAt = new Date(currentPeriodEnd * 1000);

  await account.save();
  await syncSubscriptionState(account);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const account = await ManagerAccount.findOne({
    stripeSubscriptionId: subscription.id,
    deletedAt: null,
  });
  if (!account) return;

  account.status = "cancelled";
  account.cancelAtPeriodEnd = false;
  account.renewsAt = null;
  await account.save();
  await syncSubscriptionState(account);

  // Revoke the login too: a cancelled subscription that leaves a working
  // manager account is the org giving the product away.
  if (account.managerUserId) {
    await User.findByIdAndUpdate(account.managerUserId, { isActive: false });
  }
}

async function handleInvoiceFailed(stripe: Stripe, eventInvoice: Stripe.Invoice) {
  const subscriptionId =
    typeof (eventInvoice as any).subscription === "string"
      ? (eventInvoice as any).subscription
      : (eventInvoice as any).subscription?.id;
  if (!subscriptionId) return;

  // A failure event can be delivered AFTER the retry succeeded. Re-read the
  // invoice: if it has been paid since, this event is stale and must not
  // downgrade a customer who has in fact paid.
  if (eventInvoice.id) {
    try {
      const current = await stripe.invoices.retrieve(eventInvoice.id);
      if (current.status === "paid") return;
    } catch (error: any) {
      if (error?.code === "resource_missing") return;
      throw error;
    }
  }

  const account = await ManagerAccount.findOne({
    stripeSubscriptionId: subscriptionId,
    deletedAt: null,
  });
  if (!account || account.status === "cancelled") return;

  account.status = "past_due";
  await account.save();
  await syncSubscriptionState(account);
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET;
  const apiKey = process.env.STRIPE_SECRET_KEY;

  if (!secret || !apiKey) {
    console.error("[billing] Stripe subscription webhook is not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = new Stripe(apiKey);

  let event: Stripe.Event;
  try {
    // Raw body, not parsed JSON — the signature is over the exact bytes.
    const payload = await request.text();
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    // An unverified body is an untrusted body: never act on it.
    console.error("[billing] Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await connectDB();

    // Claim the event first. Stripe delivers at-least-once, so the same event
    // id can arrive twice, even at the same moment.
    const claim = await claimStripeEvent(event, "billing");
    if (claim === "duplicate") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    if (claim === "in_progress") {
      // Another delivery is handling it right now. A non-2xx makes Stripe retry.
      return NextResponse.json(
        { error: "Event is already being processed" },
        { status: 409 }
      );
    }

    try {
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutCompleted(
            stripe,
            event.data.object as Stripe.Checkout.Session
          );
          break;
        case "invoice.paid":
          await handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;
        case "invoice.payment_failed":
          await handleInvoiceFailed(
            stripe,
            event.data.object as Stripe.Invoice
          );
          break;
        case "customer.subscription.updated":
          await handleSubscriptionChanged(
            stripe,
            event.data.object as Stripe.Subscription
          );
          break;
        case "customer.subscription.deleted":
          await handleSubscriptionDeleted(
            event.data.object as Stripe.Subscription
          );
          break;
        default:
          // Unhandled types are acknowledged, not retried forever.
          break;
      }
      await markStripeEventProcessed(event.id);
    } catch (handlerError) {
      // Forget the claim so Stripe's retry is processed rather than skipped.
      await releaseStripeEvent(event.id);
      throw handlerError;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // 500 so Stripe retries — better a duplicate delivery against idempotent
    // handlers than a paid subscription that never got provisioned.
    console.error(`[billing] Failed handling ${event.type}:`, error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}
