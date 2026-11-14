/**
 * PropertyPro - Stripe webhook (legacy path)
 *
 * DEPRECATED ALIAS of POST /api/stripe/webhook, which is the endpoint the
 * README tells you to register in Stripe.
 *
 * This path used to carry its own, second implementation. It could never run:
 * it called `headers().get(...)` without awaiting `headers()` (a Promise in
 * Next 15+), so every request failed with a 400. Two webhooks for the same
 * events would also be a trap if both were ever fixed, because each would
 * process the same Stripe event with different code.
 *
 * It now re-exports the canonical handler, so there is exactly one
 * implementation (signature check, once-only event claiming, handlers). A Stripe
 * endpoint still pointed here keeps working, with the same signing secret
 * (STRIPE_WEBHOOK_SECRET) as the canonical route. Point new endpoints at
 * /api/stripe/webhook.
 */

export const dynamic = "force-dynamic";

export { POST } from "../../stripe/webhook/route";
