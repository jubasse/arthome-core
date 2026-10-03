/**
 * The BFFs' caps on the authentication doors (`adr-auth.md` §6.2), owned here so the storefront
 * and the studio cap alike. Counted per network address until a device carries a verified identity
 * (the `device_token`): a `deviceId` the caller merely asserts caps nothing, since it can send a
 * new one with each attempt.
 */

export interface RateLimit {
  readonly limit: number;
  readonly windowSeconds: number;
}

export const AuthRateLimit = {
  /** What slows enumeration through `identity.email_taken` (D-099). */
  SIGN_UP_PER_ADDRESS: { limit: 10, windowSeconds: 3_600 },
  SIGN_IN_PER_ADDRESS: { limit: 20, windowSeconds: 900 },
  /** Password guessing against one account from many addresses. */
  SIGN_IN_PER_EMAIL: { limit: 10, windowSeconds: 900 },
  EMAIL_VERIFICATION_CONFIRM_PER_ADDRESS: { limit: 20, windowSeconds: 3_600 },
  /** Each resend is an email sent to the address: the cap is the account's. */
  EMAIL_VERIFICATION_RESEND_PER_ACCOUNT: { limit: 3, windowSeconds: 3_600 },
} as const;
