/**
 * PropertyPro - Request limits for abusable public endpoints
 *
 * Sign-in throttling (login-throttle.ts) counts FAILURES. This counts every
 * request, for endpoints where the harm is volume rather than a wrong answer:
 *
 *   forgot-password  each request can send a real email, so an attacker could
 *                    flood a victim's inbox or burn the sending quota
 *   sign-up          mass account creation
 *
 * Fixed windows, kept in MongoDB (shared across serverless instances) through
 * the same store as the sign-in throttle. A request that is refused is NOT
 * counted, so hammering a full bucket does not extend it. Fails OPEN if the
 * store is unavailable. The limits apply the same way to any email, real or
 * not, so they reveal nothing about which accounts exist.
 */

import { NextResponse } from "next/server";
import { mongoStore, type AttemptStore } from "@/lib/auth/login-throttle";

const HOUR_MS = 60 * 60 * 1000;

export interface LimitRule {
  key: string;
  max: number;
  windowMs: number;
}

export type LimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number };

export const FORGOT_PASSWORD_LIMITS = { perEmail: 3, perIp: 10, windowMs: HOUR_MS } as const;
export const REGISTER_LIMITS = { perEmail: 5, perIp: 10, windowMs: HOUR_MS } as const;

const norm = (email: string) => email.trim().toLowerCase();

/** `email` may be null (missing/invalid); `ip` null when it cannot be trusted. */
export function forgotPasswordRules(email: string | null, ip: string | null): LimitRule[] {
  const rules: LimitRule[] = [];
  if (email) rules.push({ key: `rl:forgot:email:${norm(email)}`, max: FORGOT_PASSWORD_LIMITS.perEmail, windowMs: FORGOT_PASSWORD_LIMITS.windowMs });
  if (ip) rules.push({ key: `rl:forgot:ip:${ip}`, max: FORGOT_PASSWORD_LIMITS.perIp, windowMs: FORGOT_PASSWORD_LIMITS.windowMs });
  return rules;
}

export function registerRules(email: string | null, ip: string | null): LimitRule[] {
  const rules: LimitRule[] = [];
  if (email) rules.push({ key: `rl:register:email:${norm(email)}`, max: REGISTER_LIMITS.perEmail, windowMs: REGISTER_LIMITS.windowMs });
  if (ip) rules.push({ key: `rl:register:ip:${ip}`, max: REGISTER_LIMITS.perIp, windowMs: REGISTER_LIMITS.windowMs });
  return rules;
}

/** An email-shaped string from an untrusted body, or null. */
export function emailFromBody(body: unknown): string | null {
  const email = (body as any)?.email;
  return typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;
}

/**
 * Checks every rule and, if none is full, counts this request against all of
 * them. Call once per request, before doing any work.
 */
export async function consumeRateLimits(
  rules: LimitRule[],
  store: AttemptStore = mongoStore,
  now: number = Date.now()
): Promise<LimitDecision> {
  try {
    let blockedUntil = 0;
    for (const rule of rules) {
      const row = await store.get(rule.key);
      const end = row ? new Date(row.windowEndsAt).getTime() : 0;
      if (row && end > now && row.count >= rule.max) {
        blockedUntil = Math.max(blockedUntil, end);
      }
    }
    if (blockedUntil > now) {
      return { allowed: false, retryAfterSec: Math.ceil((blockedUntil - now) / 1000) };
    }
    for (const rule of rules) {
      await store.increment(rule.key, now, rule.windowMs);
    }
  } catch (error) {
    console.error("[request-limit] store error; allowing request:", error);
  }
  return { allowed: true };
}

/** A 429 with Retry-After, and the same wording for any endpoint. */
export function tooManyRequests(retryAfterSec: number): NextResponse {
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
  return NextResponse.json(
    {
      success: false,
      error: `Too many requests. Please try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
  );
}
