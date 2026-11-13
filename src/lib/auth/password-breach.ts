/**
 * PropertyPro - Breached / common password check
 *
 * Length alone does not stop "password1234": NIST SP 800-63B asks that a new
 * password is also checked against passwords known to be compromised. Two
 * layers, cheapest first:
 *
 *  1. A small built-in list (works offline): very common long passwords, plus
 *     the demo passwords that are published in this repository.
 *  2. Have I Been Pwned's Pwned Passwords range API (k-anonymity). Only the
 *     FIRST FIVE characters of the password's SHA-1 hash are sent; the full
 *     hash and the password never leave this server. `Add-Padding` hides how
 *     many real matches a prefix has.
 *
 * Fails OPEN: if the service is slow or down, the password is accepted and a
 * warning is logged. Refusing every sign-up because a third party is offline
 * would be the worse failure. Set DISABLE_BREACHED_PASSWORD_CHECK=true to skip
 * layer 2 entirely (e.g. in an air-gapped deployment).
 *
 * Server-only (uses node:crypto). Call it AFTER the length policy.
 */

import { createHash } from "crypto";

export const BREACHED_PASSWORD_MESSAGE =
  "This password has appeared in a known data breach or is too common. Please choose a different one.";

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/";
const HIBP_TIMEOUT_MS = 3000;

/** A match must have been seen at least this many times in breaches. */
export const BREACH_COUNT_THRESHOLD = 1;

// Lower-cased. Long passwords people really use, product-specific guesses, and
// the demo credentials that are public in this repo's seed scripts.
const BLOCKLIST = new Set(
  [
    "password1234",
    "password12345",
    "password123456",
    "passwordpassword",
    "123456789012",
    "1234567890123",
    "12345678901234",
    "qwertyuiop12",
    "qwertyuiopas",
    "qwertyuiop123",
    "1qaz2wsx3edc",
    "iloveyou1234",
    "letmein123456",
    "welcome12345",
    "welcome123456",
    "administrator",
    "administrator1",
    "changemeplease",
    "changeme12345",
    "abcdefghijkl",
    "abc123456789",
    "trustno1trustno1",
    "propertypro",
    "propertypro1",
    "propertypro123",
    "propertypro1234",
    "propertypro12345",
    "propertymanagement",
    "propertymanagement1",
    // Published demo credentials (src/scripts/seed-demo-*.ts, demo-data service)
    "admin1234567$",
    "manager1234567$",
    "tenant1234567$",
    "demoadmin1234!",
    "quickdemo123!",
    "manager1234567!",
    "owner1234567!",
    "agent1234567!",
    "tenant1234567!",
    "maintenance123!",
    "test1234567890",
  ].map((p) => p.toLowerCase())
);

export type BreachResult =
  | { status: "breached"; source: "list" | "hibp"; count?: number }
  | { status: "ok" }
  | { status: "unchecked"; reason: string };

export interface BreachCheckOptions {
  /** Injectable for tests. Defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

export async function checkPasswordBreached(
  password: string,
  options: BreachCheckOptions = {}
): Promise<BreachResult> {
  if (BLOCKLIST.has(password.toLowerCase())) {
    return { status: "breached", source: "list" };
  }

  if (process.env.DISABLE_BREACHED_PASSWORD_CHECK === "true") {
    return { status: "unchecked", reason: "disabled" };
  }

  const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  const doFetch = options.fetchImpl ?? fetch;

  try {
    const res = await doFetch(`${HIBP_RANGE_URL}${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "PropertyPro-password-check" },
      signal: AbortSignal.timeout(HIBP_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[password-breach] HIBP returned HTTP ${res.status}; not checked`);
      return { status: "unchecked", reason: `http_${res.status}` };
    }

    const body = await res.text();
    for (const line of body.split("\n")) {
      const [hashSuffix, countText] = line.trim().split(":");
      if (hashSuffix?.toUpperCase() !== suffix) continue;
      const count = parseInt(countText ?? "0", 10) || 0;
      // Padding rows carry a count of 0 and are not real matches.
      if (count >= BREACH_COUNT_THRESHOLD) {
        return { status: "breached", source: "hibp", count };
      }
    }
    return { status: "ok" };
  } catch (error: any) {
    console.warn(
      `[password-breach] check failed (${error?.name || "error"}); password accepted unchecked`
    );
    return { status: "unchecked", reason: error?.name || "error" };
  }
}
