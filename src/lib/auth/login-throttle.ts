/**
 * PropertyPro - Sign-in throttling
 *
 * Slows password guessing. Each FAILED sign-in is counted against three keys;
 * when any key reaches its limit it is locked for LOCK_MS and further attempts
 * on it are refused outright, even with the right password (otherwise an
 * attacker could keep guessing and learn the answer from the one that works).
 *
 *   pair     email + IP   5   a single attacker is stopped fast, while the real
 *                             owner signing in from their own network is not
 *   account  email       10   guessing spread over many IPs; higher than `pair`
 *                             so one stranger cannot trivially lock you out
 *   ip       IP          30   credential stuffing across many emails
 *
 * The counters do not depend on the account existing, so the response is the
 * same for real and made-up emails (no account enumeration).
 *
 * State lives in MongoDB (LoginAttempt) so it is shared by every serverless
 * instance. Fails OPEN on a store error: that is logged loudly, and sign-in
 * itself still needs the database to work.
 */

import { LoginAttempt } from "@/models";

export const WINDOW_MS = 15 * 60 * 1000;
export const LOCK_MS = 15 * 60 * 1000;
export const LIMITS = { pair: 5, account: 10, ip: 30 } as const;
const PURGE_GRACE_MS = 60 * 60 * 1000;

export interface AttemptRow {
  count: number;
  windowEndsAt: Date;
  lockedUntil?: Date | null;
}

/** Persistence, injectable so the logic can be tested without a database. */
export interface AttemptStore {
  get(key: string): Promise<AttemptRow | null>;
  /** Count one failure in the current window (starting a new window if needed). */
  increment(key: string, now: number): Promise<AttemptRow>;
  lock(key: string, until: Date): Promise<void>;
  clear(key: string): Promise<void>;
}

export const mongoStore: AttemptStore = {
  async get(key) {
    return (await LoginAttempt.findOne({ key }).lean()) as AttemptRow | null;
  },

  async increment(key, now) {
    const bump = () =>
      LoginAttempt.findOneAndUpdate(
        { key, windowEndsAt: { $gt: new Date(now) } },
        { $inc: { count: 1 } },
        { new: true }
      ).lean();

    const live = await bump();
    if (live) return live as unknown as AttemptRow;

    // No live window: start one. If another request created it in between,
    // the unique index rejects the upsert and we count into theirs instead.
    const windowEndsAt = new Date(now + WINDOW_MS);
    try {
      return (await LoginAttempt.findOneAndUpdate(
        { key },
        {
          $set: {
            count: 1,
            windowEndsAt,
            lockedUntil: null,
            purgeAt: new Date(windowEndsAt.getTime() + PURGE_GRACE_MS),
          },
        },
        { upsert: true, new: true }
      ).lean()) as unknown as AttemptRow;
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
      const retry = await bump();
      if (retry) return retry as unknown as AttemptRow;
      throw error;
    }
  },

  async lock(key, until) {
    await LoginAttempt.updateOne(
      { key },
      {
        $set: {
          lockedUntil: until,
          purgeAt: new Date(until.getTime() + PURGE_GRACE_MS),
        },
      }
    );
  },

  async clear(key) {
    await LoginAttempt.deleteOne({ key });
  },
};

/** Best available client IP, or null when it cannot be trusted/determined. */
export function clientIpFromHeaders(
  headers: { get(name: string): string | null } | null | undefined
): string | null {
  if (!headers) return null;
  const candidate =
    headers.get("x-vercel-forwarded-for") ||
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0];
  const ip = candidate?.trim();
  return ip ? ip : null;
}

const normaliseEmail = (email: string) => email.trim().toLowerCase();

function keysFor(email: string, ip: string | null) {
  const e = normaliseEmail(email);
  const keys: { key: string; max: number }[] = [
    { key: `account:${e}`, max: LIMITS.account },
  ];
  // Without a usable IP there is no per-client key: lumping every unknown
  // client together under one "unknown" IP would lock everyone out at once.
  if (ip) {
    keys.push({ key: `pair:${e}|${ip}`, max: LIMITS.pair });
    keys.push({ key: `ip:${ip}`, max: LIMITS.ip });
  }
  return keys;
}

export type ThrottleDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number };

/** Call BEFORE checking the password. */
export async function checkLoginAllowed(
  email: string,
  ip: string | null,
  store: AttemptStore = mongoStore,
  now: number = Date.now()
): Promise<ThrottleDecision> {
  try {
    let latest = 0;
    for (const { key } of keysFor(email, ip)) {
      const row = await store.get(key);
      const until = row?.lockedUntil ? new Date(row.lockedUntil).getTime() : 0;
      if (until > now) latest = Math.max(latest, until);
    }
    if (latest > now) {
      return { allowed: false, retryAfterSec: Math.ceil((latest - now) / 1000) };
    }
  } catch (error) {
    console.error("[login-throttle] check failed; allowing sign-in:", error);
  }
  return { allowed: true };
}

/** Call after every failed credential check. */
export async function recordLoginFailure(
  email: string,
  ip: string | null,
  store: AttemptStore = mongoStore,
  now: number = Date.now()
): Promise<void> {
  try {
    for (const { key, max } of keysFor(email, ip)) {
      const row = await store.increment(key, now);
      if (row.count >= max) {
        await store.lock(key, new Date(now + LOCK_MS));
      }
    }
  } catch (error) {
    console.error("[login-throttle] could not record failure:", error);
  }
}

/** Call after a successful sign-in: forgive this person's earlier typos. */
export async function recordLoginSuccess(
  email: string,
  ip: string | null,
  store: AttemptStore = mongoStore
): Promise<void> {
  try {
    const e = normaliseEmail(email);
    await store.clear(`account:${e}`);
    if (ip) await store.clear(`pair:${e}|${ip}`);
    // The IP counter is deliberately left alone: one valid login must not wipe
    // the record of an address that has been failing against other accounts.
  } catch (error) {
    console.error("[login-throttle] could not clear counters:", error);
  }
}
