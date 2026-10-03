/**
 * The BFFs' caps on the authentication doors (`adr-auth.md` §6.2), owned here so the storefront
 * and the studio cap alike. Counted per network address, an IPv6 address counting as its /64,
 * until a device carries a verified identity (the `device_token`): a `deviceId` the caller merely
 * asserts caps nothing, since it can send a new one with each attempt.
 */

export interface RateLimit {
  readonly limit: number;
  readonly windowSeconds: number;
}

export const AuthRateLimit = {
  /** What slows enumeration through `identity.email_taken` (D-099). */
  SIGN_UP_PER_ADDRESS: { limit: 10, windowSeconds: 3_600 },
  SIGN_IN_PER_ADDRESS: { limit: 20, windowSeconds: 900 },
  /**
   * Password guessing against one account FROM ONE ADDRESS: the only hard cap an email carries, so
   * a third party exhausts it for itself alone. Across addresses an email is slowed down, never
   * refused (`SignInSlowdown`): nobody can lock an account's owner out.
   */
  SIGN_IN_PER_EMAIL: { limit: 10, windowSeconds: 900 },
  EMAIL_VERIFICATION_CONFIRM_PER_ADDRESS: { limit: 20, windowSeconds: 3_600 },
  /** Each resend is an email sent to the address: the cap is the account's. */
  EMAIL_VERIFICATION_RESEND_PER_ACCOUNT: { limit: 3, windowSeconds: 3_600 },
  /**
   * An account has one address, and D-100 lets anyone register an address they do not own: this
   * bounds what a stranger's registration can send it in a day.
   */
  EMAIL_VERIFICATION_RESEND_PER_ACCOUNT_DAILY: { limit: 5, windowSeconds: 86_400 },
} as const;

/**
 * Failed sign-ins to one email, from anywhere, delay the next attempt rather than refuse it: a
 * growing pause, bounded, which slows a spray across addresses and never locks the owner out.
 */
export const SignInSlowdown = {
  FREE_FAILURES: 5,
  FIRST_DELAY_MS: 250,
  MAX_DELAY_MS: 4_000,
  WINDOW_SECONDS: 900,
} as const;

/** The pause before an attempt on an email that has failed `failures` times in the window. */
export function signInDelayMs(failures: number): number {
  const beyond = failures - SignInSlowdown.FREE_FAILURES;
  if (beyond <= 0) return 0;
  return Math.min(SignInSlowdown.FIRST_DELAY_MS * 2 ** (beyond - 1), SignInSlowdown.MAX_DELAY_MS);
}
