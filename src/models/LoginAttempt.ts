/**
 * PropertyPro - LoginAttempt model
 *
 * Failed-sign-in counters used by src/lib/auth/login-throttle.ts. One row per
 * throttle key (e.g. `pair:alice@example.com|203.0.113.9`), holding the number
 * of failures in the current window and, once the limit is hit, a lock-out
 * time. Stored in MongoDB rather than memory so the counts are shared by every
 * serverless instance. Collection name: `login_attempts`.
 *
 * Rows delete themselves via the TTL index on `purgeAt`.
 */

import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILoginAttempt extends Document {
  key: string;
  count: number;
  windowEndsAt: Date;
  lockedUntil?: Date | null;
  purgeAt: Date;
}

const LoginAttemptSchema = new Schema<ILoginAttempt>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    count: { type: Number, required: true, default: 0 },
    windowEndsAt: { type: Date, required: true },
    lockedUntil: { type: Date, default: null },
    purgeAt: { type: Date, required: true },
  },
  { collection: "login_attempts" }
);

// Remove each row once its `purgeAt` time has passed.
LoginAttemptSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

let LoginAttempt: Model<ILoginAttempt>;

try {
  LoginAttempt = mongoose.model<ILoginAttempt>("LoginAttempt");
} catch {
  LoginAttempt = mongoose.model<ILoginAttempt>("LoginAttempt", LoginAttemptSchema);
}

export default LoginAttempt;
