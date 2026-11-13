/**
 * PropertyPro - Guards for routes that should not be reachable in production
 *
 * Two kinds of route need protecting beyond the normal role check:
 *
 *  1. Seed / demo / debug routes. They write fake data (or, for DELETE
 *     /api/demo-data, wipe real collections), so in production they answer
 *     404 unless ENABLE_DEMO_ROUTES=true is set deliberately. 404 rather than
 *     403 so the route does not advertise that it exists.
 *
 *  2. The one-time "create the first admin" setup route. It has no signed-in
 *     user to check (there is no admin yet), so it is protected by a secret
 *     SETUP_TOKEN instead, sent as the `x-setup-token` header. With no token
 *     configured the route is switched off.
 *
 * Both fail CLOSED.
 */

import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

const notFound = () =>
  NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

const digest = (value: string) => createHash("sha256").update(value).digest();

/** A setup token shorter than this is treated as "not configured". */
export const MIN_SETUP_TOKEN_LENGTH = 24;

/** Returns a 404 response when demo/seed/debug routes are switched off. */
export function demoRoutesBlocked(): NextResponse | null {
  if (process.env.NODE_ENV !== "production") return null;
  if (process.env.ENABLE_DEMO_ROUTES === "true") return null;
  return notFound();
}

/** Wraps a route handler so it only runs when demo routes are allowed. */
export function demoRoute<A extends unknown[]>(
  handler: (...args: A) => Promise<Response> | Response
) {
  return async (...args: A): Promise<Response> =>
    demoRoutesBlocked() ?? handler(...args);
}

/** Returns an error response unless the request carries the correct SETUP_TOKEN. */
export function checkSetupToken(req: Request): NextResponse | null {
  const expected = process.env.SETUP_TOKEN;
  if (!expected || expected.length < MIN_SETUP_TOKEN_LENGTH) {
    // Not configured (or too weak to trust): the route does not exist.
    return notFound();
  }

  const provided = req.headers.get("x-setup-token") ?? "";
  // Hash both sides so timingSafeEqual always gets equal-length inputs.
  if (!timingSafeEqual(digest(provided), digest(expected))) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  return null;
}
