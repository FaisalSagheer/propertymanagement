/**
 * PropertyPro - Stripe webhook idempotency
 *
 * Usage inside a webhook, after the signature has been verified:
 *
 *   const claim = await claimStripeEvent(event, "billing");
 *   if (claim === "duplicate")   return 200   // already handled
 *   if (claim === "in_progress") return 409   // another delivery is mid-flight; Stripe retries
 *   try { ...handle...; await markStripeEventProcessed(event.id); }
 *   catch (e) { await releaseStripeEvent(event.id); throw e; }   // let Stripe retry
 *
 * The claim is an insert guarded by a unique index, so two concurrent
 * deliveries cannot both win. A claim left "processing" by a crashed worker is
 * taken over after STALE_CLAIM_MS.
 */

import { StripeEvent } from "@/models";

export type ClaimResult = "claimed" | "duplicate" | "in_progress";

/** A claim older than this is assumed to belong to a crashed worker. */
export const STALE_CLAIM_MS = 5 * 60 * 1000;

export async function claimStripeEvent(
  event: { id: string; type: string },
  source: string
): Promise<ClaimResult> {
  try {
    await StripeEvent.create({
      eventId: event.id,
      type: event.type,
      source,
      status: "processing",
    });
    return "claimed";
  } catch (error: any) {
    if (error?.code !== 11000) throw error; // a real failure: let the caller 500
  }

  const existing = await StripeEvent.findOne({ eventId: event.id });
  if (!existing) {
    // Released between our insert and this read: try once more.
    return claimStripeEvent(event, source);
  }
  if (existing.status === "processed") return "duplicate";

  // Still "processing". If it is old, its worker died: take it over atomically.
  const takeover = await StripeEvent.findOneAndUpdate(
    {
      eventId: event.id,
      status: "processing",
      receivedAt: { $lt: new Date(Date.now() - STALE_CLAIM_MS) },
    },
    { $set: { receivedAt: new Date() }, $inc: { attempts: 1 } }
  );
  return takeover ? "claimed" : "in_progress";
}

export async function markStripeEventProcessed(eventId: string): Promise<void> {
  await StripeEvent.updateOne(
    { eventId },
    { $set: { status: "processed", processedAt: new Date() } }
  );
}

/** Forget a claim whose handler failed, so Stripe's retry is processed afresh. */
export async function releaseStripeEvent(eventId: string): Promise<void> {
  try {
    await StripeEvent.deleteOne({ eventId, status: "processing" });
  } catch (error) {
    // Best effort: if this fails the claim goes stale and is taken over later.
    console.error(`[stripe] could not release event ${eventId}:`, error);
  }
}
