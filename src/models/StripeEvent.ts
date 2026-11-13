/**
 * PropertyPro - StripeEvent model
 *
 * A ledger of Stripe webhook events we have received, keyed by Stripe's event
 * id. Stripe delivers at-least-once and retries on any non-2xx, so the same
 * event can arrive twice (or concurrently). The unique `eventId` index is what
 * lets a webhook CLAIM an event atomically before acting on it.
 *
 * Rows expire after 30 days (TTL index): Stripe stops retrying long before
 * that, so the table stays small. Collection name: `stripe_events`.
 */

import mongoose, { Schema, Document, Model } from "mongoose";

export type StripeEventStatus = "processing" | "processed";

export interface IStripeEvent extends Document {
  eventId: string;
  type: string;
  /** Which webhook endpoint received it, e.g. "billing" or "payments". */
  source: string;
  status: StripeEventStatus;
  attempts: number;
  receivedAt: Date;
  processedAt?: Date | null;
}

const StripeEventSchema = new Schema<IStripeEvent>(
  {
    eventId: { type: String, required: true, unique: true, trim: true },
    type: { type: String, required: true, trim: true },
    source: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["processing", "processed"],
      default: "processing",
      required: true,
    },
    attempts: { type: Number, default: 1 },
    receivedAt: { type: Date, default: Date.now },
    processedAt: { type: Date, default: null },
  },
  { collection: "stripe_events" }
);

// Drop rows 30 days after they were first received.
StripeEventSchema.index({ receivedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

let StripeEvent: Model<IStripeEvent>;

try {
  StripeEvent = mongoose.model<IStripeEvent>("StripeEvent");
} catch {
  StripeEvent = mongoose.model<IStripeEvent>("StripeEvent", StripeEventSchema);
}

export default StripeEvent;
