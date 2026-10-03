/**
 * How long each credential lives. Each value names the document that decided it, and that document
 * stays its owner (critical rule 15): the code reads it from here, never copies it.
 */

/** `adr-auth.md` §6.1: a session lives seven days. */
export const SESSION_LIFETIME_SECONDS: number = 7 * 24 * 60 * 60;

/** `adr-auth.md` §6.1: a session in use slides forward at most once a day. */
export const SESSION_RENEWAL_AGE_SECONDS: number = 24 * 60 * 60;

/** `adr-auth.md` §8: one internal token covers one BFF → service call. */
export const INTERNAL_TOKEN_LIFETIME_SECONDS = 60;

/** `adr-auth.md` §5.2 and §9.5: every verifier tolerates this much clock skew, both ways. */
export const TOKEN_CLOCK_TOLERANCE_SECONDS = 30;

/**
 * `adr-auth.md` §6.7 (auth Q2, 2026-10-03): an email verification link expires after a day, and is
 * spent by its first use.
 */
export const EMAIL_VERIFICATION_LINK_LIFETIME_HOURS = 24;
