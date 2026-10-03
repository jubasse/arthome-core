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
export declare const AuthRateLimit: {
    /** What slows enumeration through `identity.email_taken` (D-099). */
    readonly SIGN_UP_PER_ADDRESS: {
        readonly limit: 10;
        readonly windowSeconds: 3600;
    };
    readonly SIGN_IN_PER_ADDRESS: {
        readonly limit: 20;
        readonly windowSeconds: 900;
    };
    /**
     * Password guessing against one account FROM ONE ADDRESS: the only hard cap an email carries, so
     * a third party exhausts it for itself alone and nobody can lock an account's owner out. The real
     * bound on guessing is therefore this limit per (email, address) per window, TIMES the attacker's
     * networks: an attacker holding many addresses or /64s guesses that much faster. Slice C's device
     * cookies (OWASP's), which recognise the owner's device, are what tightens it.
     */
    readonly SIGN_IN_PER_EMAIL: {
        readonly limit: 10;
        readonly windowSeconds: 900;
    };
    readonly EMAIL_VERIFICATION_CONFIRM_PER_ADDRESS: {
        readonly limit: 20;
        readonly windowSeconds: 3600;
    };
    /** Each resend is an email sent to the address: the cap is the account's. */
    readonly EMAIL_VERIFICATION_RESEND_PER_ACCOUNT: {
        readonly limit: 3;
        readonly windowSeconds: 3600;
    };
    /**
     * An account has one address, and D-100 lets anyone register an address they do not own: this
     * bounds what a stranger's registration can send it in a day.
     */
    readonly EMAIL_VERIFICATION_RESEND_PER_ACCOUNT_DAILY: {
        readonly limit: 5;
        readonly windowSeconds: 86400;
    };
};
/**
 * Failed sign-ins to one email, from anywhere, delay its next attempt rather than refuse it: a
 * growing pause, bounded, which never locks the owner out. It does NOT slow a spray across
 * addresses: attempts sent in parallel each wait their pause at once, so it costs a sequential
 * guesser latency and nothing more. The bound is `SIGN_IN_PER_EMAIL`'s.
 */
export declare const SignInSlowdown: {
    readonly FREE_FAILURES: 5;
    readonly FIRST_DELAY_MS: 250;
    readonly MAX_DELAY_MS: 4000;
    readonly WINDOW_SECONDS: 900;
};
/** The pause before an attempt on an email that has failed `failures` times in the window. */
export declare function signInDelayMs(failures: number): number;
//# sourceMappingURL=rate-limits.d.ts.map