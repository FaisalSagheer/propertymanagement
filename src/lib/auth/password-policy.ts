/**
 * PropertyPro - Password policy
 *
 * One definition shared by every place a password is chosen (sign-up, reset,
 * first-time setup) and by the forms that tell the user the rule, so the
 * server and the UI can never disagree.
 *
 * Length is the rule that matters: NIST SP 800-63B favours a long minimum and
 * no composition rules ("must include a symbol") over short, complex ones.
 * Raise MIN_PASSWORD_LENGTH here and every check follows.
 *
 * Kept free of server-only imports so client components can use it.
 * Existing users are not affected until they next set a password.
 */

export const MIN_PASSWORD_LENGTH = 12;
// bcrypt only uses the first 72 bytes, so a very high cap buys nothing, but
// this stays well above any realistic passphrase.
export const MAX_PASSWORD_LENGTH = 128;

export const PASSWORD_MIN_MESSAGE = `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`;
export const PASSWORD_MAX_MESSAGE = `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters`;
export const PASSWORD_HINT = `At least ${MIN_PASSWORD_LENGTH} characters. A short sentence you can remember works well.`;

/** Returns an error message, or null when the password is acceptable. */
export function validatePasswordPolicy(password: unknown): string | null {
  if (typeof password !== "string") return "Password is required";
  if (password.length < MIN_PASSWORD_LENGTH) return PASSWORD_MIN_MESSAGE;
  if (password.length > MAX_PASSWORD_LENGTH) return PASSWORD_MAX_MESSAGE;
  return null;
}
