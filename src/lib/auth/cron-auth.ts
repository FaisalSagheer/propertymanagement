/**
 * PropertyPro - Cron endpoint authorisation
 *
 * Cron routes change data (e.g. expiring leases), so they must not be callable
 * by anyone who finds the URL. The caller must send
 *
 *     Authorization: Bearer <CRON_SECRET>
 *
 * (Vercel Cron adds this header automatically when CRON_SECRET is set.)
 *
 * Fails CLOSED: if CRON_SECRET is not configured the route refuses to run,
 * rather than falling back to being open.
 */

import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

const digest = (value: string) => createHash("sha256").update(value).digest();

/** Returns an error response when the request is not authorised, else null. */
export function checkCronAuth(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron] CRON_SECRET is not set - refusing to run");
    return NextResponse.json(
      { success: false, error: "Cron is not configured" },
      { status: 500 }
    );
  }

  const header = req.headers.get("authorization") ?? "";
  // Hash both sides so timingSafeEqual always gets equal-length inputs and the
  // comparison time does not depend on how much of the secret was guessed.
  const ok = timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
  if (!ok) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  return null;
}
