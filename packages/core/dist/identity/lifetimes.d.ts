/**
 * How long each credential lives. Each value names the document that decided it, and that document
 * stays its owner (critical rule 15): the code reads it from here, never copies it.
 */
/** `adr-auth.md` §6.1: a session lives seven days. */
export declare const SESSION_LIFETIME_SECONDS: number;
/** `adr-auth.md` §6.1: a session in use slides forward at most once a day. */
export declare const SESSION_RENEWAL_AGE_SECONDS: number;
/** `adr-auth.md` §8: one internal token covers one BFF → service call. */
export declare const INTERNAL_TOKEN_LIFETIME_SECONDS = 60;
/** `adr-auth.md` §5.2 and §9.5: every verifier tolerates this much clock skew, both ways. */
export declare const TOKEN_CLOCK_TOLERANCE_SECONDS = 30;
/**
 * `adr-auth.md` §6.7 (auth Q2, 2026-10-03): an email verification link expires after a day, and is
 * spent by its first use.
 */
export declare const EMAIL_VERIFICATION_LINK_LIFETIME_HOURS = 24;
//# sourceMappingURL=lifetimes.d.ts.map