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
    /** Password guessing against one account from many addresses. */
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
};
//# sourceMappingURL=rate-limits.d.ts.map