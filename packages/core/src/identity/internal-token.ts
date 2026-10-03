/**
 * The internal token a BFF mints for each call to a service (`adr-auth.md` §8): ES256, the BFF as
 * issuer, the target service as audience. A service verifies it locally against the JWKS document,
 * with the issuer, the audience and the algorithm pinned.
 */

/** `adr-auth.md` §8.1: ES256 for every issuer, never EdDSA. */
export const INTERNAL_TOKEN_ALGORITHM = 'ES256';

/** The two BFFs, the only callers of a service. */
export const INTERNAL_TOKEN_ISSUERS = ['arthome.bff-storefront', 'arthome.bff-studio'] as const;
export type InternalTokenIssuer = (typeof INTERNAL_TOKEN_ISSUERS)[number];

export const InternalTokenIssuer = {
  STOREFRONT_BFF: 'arthome.bff-storefront',
  STUDIO_BFF: 'arthome.bff-studio',
} as const;

/**
 * `adr-auth.md` §8.1: one JWKS document carries four issuers' keys, told apart by this prefix of
 * their `kid`. A verifier checks the prefix against the token's issuer, or the device key could
 * sign a token that claims to come from a BFF.
 */
export const KEY_ID_PREFIX_BY_ISSUER: Readonly<Record<InternalTokenIssuer, string>> = {
  [InternalTokenIssuer.STOREFRONT_BFF]: 'bff-sf-',
  [InternalTokenIssuer.STUDIO_BFF]: 'bff-st-',
};

/**
 * `transport.md` §5.2: a token minted for one service is refused by every other. `service` is a
 * `Service` member, or a generated service's name until core has it.
 */
export function audienceOf(service: string): string {
  return `arthome.${service}`;
}

export function isKeyIdOfIssuer(keyId: string | undefined, issuer: InternalTokenIssuer): boolean {
  return keyId?.startsWith(KEY_ID_PREFIX_BY_ISSUER[issuer]) === true;
}
