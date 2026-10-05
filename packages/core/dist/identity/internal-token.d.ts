/**
 * The internal token a BFF mints for each call to a service (`adr-auth.md` §8): ES256, the BFF as
 * issuer, the target service as audience. A service verifies it locally against the JWKS document,
 * with the issuer, the audience and the algorithm pinned.
 */
/** `adr-auth.md` §8.1: ES256 for every issuer, never EdDSA. */
export declare const INTERNAL_TOKEN_ALGORITHM = "ES256";
/** The two BFFs, the only callers of a service. */
export declare const INTERNAL_TOKEN_ISSUERS: readonly ["arthome.bff-storefront", "arthome.bff-studio"];
export type InternalTokenIssuer = (typeof INTERNAL_TOKEN_ISSUERS)[number];
export declare const InternalTokenIssuer: {
    readonly STOREFRONT_BFF: "arthome.bff-storefront";
    readonly STUDIO_BFF: "arthome.bff-studio";
};
/**
 * `adr-auth.md` §8.1: one JWKS document carries four issuers' keys, told apart by this prefix of
 * their `kid`. A verifier checks the prefix against the token's issuer, or the device key could
 * sign a token that claims to come from a BFF.
 */
export declare const KEY_ID_PREFIX_BY_ISSUER: Readonly<Record<InternalTokenIssuer, string>>;
/**
 * `transport.md` §5.2: a token minted for one service is refused by every other. `service` is a
 * `Service` member, or a generated service's name until core has it.
 */
export declare function audienceOf(service: string): string;
export declare function isKeyIdOfIssuer(keyId: string | undefined, issuer: InternalTokenIssuer): boolean;
//# sourceMappingURL=internal-token.d.ts.map