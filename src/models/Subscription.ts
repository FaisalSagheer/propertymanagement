/**
 * PropertyPro - Subscription model
 *
 * One document per plan subscription held by a user: which plan they are on,
 * its state, the current billing period and, for card-billed plans, the Stripe
 * ids needed to reconcile webhooks. Collection name: `subscriptions`.
 *
 * Note: ManagerAccount (src/models/ManagerAccount.ts) already records the plan
 * and Stripe ids for accounts the admin sold. This model is standalone and is
 * not yet read or written by the billing routes; wire it in deliberately so the
 * two never disagree about what a customer is paying for.
 */

import mongoose, { Schema, Document, Model } from "mongoose";

export type SubscriptionStatus =
  | "pending"
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired";

export type SubscriptionBillingCycle = "monthly" | "annual";
export type SubscriptionPaymentMethod = "cash" | "card";

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
  /** Set when the subscription belongs to an admin-sold manager account. */
  managerAccountId?: mongoose.Types.ObjectId | null;
  /** A plan id from MANAGER_PLANS in src/lib/billing/plans.ts. */
  planId: string;
  status: SubscriptionStatus;
  billingCycle: SubscriptionBillingCycle;
  /** Price per cycle, GBP major units. 0 for the free tier. */
  amount: number;
  currency: string;
  /** Units the plan covers. null = unlimited / negotiated. */
  unitLimit?: number | null;
  paymentMethod: SubscriptionPaymentMethod;
  startedAt: Date;
  trialEndsAt?: Date | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  lastPaymentAt?: Date | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: Date | null;
  cancellationReason?: string;
  /** Set only for card-billed subscriptions. */
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  notes?: string;
  /** Soft delete, matching the convention used across the other models. */
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    managerAccountId: {
      type: Schema.Types.ObjectId,
      ref: "ManagerAccount",
      default: null,
    },
    planId: {
      type: String,
      required: [true, "Plan is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "trialing", "active", "past_due", "cancelled", "expired"],
      default: "pending",
      required: true,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "annual"],
      default: "monthly",
      required: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
      default: 0,
    },
    currency: {
      type: String,
      default: "GBP",
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
    },
    unitLimit: { type: Number, min: [0, "Unit limit cannot be negative"], default: null },
    paymentMethod: {
      type: String,
      enum: ["cash", "card"],
      default: "card",
      required: true,
    },
    startedAt: { type: Date, required: true, default: Date.now },
    trialEndsAt: { type: Date, default: null },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    lastPaymentAt: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    cancelledAt: { type: Date, default: null },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [500, "Cancellation reason is too long"],
    },
    stripeCustomerId: { type: String, default: null, trim: true },
    stripeSubscriptionId: { type: String, default: null, trim: true },
    stripePriceId: { type: String, default: null, trim: true },
    notes: { type: String, trim: true, maxlength: [2000, "Notes are too long"] },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "subscriptions" }
);

SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });
SubscriptionSchema.index({ managerAccountId: 1 }, { sparse: true });
SubscriptionSchema.index({ stripeCustomerId: 1 }, { sparse: true });
// Stripe retries webhooks, so a duplicate delivery must collide rather than
// quietly create a second subscription row.
SubscriptionSchema.index(
  { stripeSubscriptionId: 1 },
  { unique: true, sparse: true }
);

// Escapable soft-delete filter: a query naming `deletedAt` opts out, which is
// how a history or restore view reaches these rows. Same pattern as Lease and
// Invoice. It does NOT run for countDocuments() or aggregate().
SubscriptionSchema.pre(/^find/, function (this: any) {
  const conditions = this.getQuery();
  if (!("deletedAt" in conditions)) {
    this.where({ deletedAt: null });
  }
});

let Subscription: Model<ISubscription>;

try {
  Subscription = mongoose.model<ISubscription>("Subscription");
} catch {
  Subscription = mongoose.model<ISubscription>(
    "Subscription",
    SubscriptionSchema
  );
}

export default Subscription;
