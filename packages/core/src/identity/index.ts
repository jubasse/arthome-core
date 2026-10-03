/** The identity context's rules: credentials' lifetimes, the internal token, the doors' caps. */

export {
  GENERATED_HANDLE_ALPHABET,
  GENERATED_HANDLE_RANDOM_LENGTH,
  generatedPublicHandle,
} from './public-handle.js';
export {
  EMAIL_VERIFICATION_LINK_LIFETIME_HOURS,
  INTERNAL_TOKEN_LIFETIME_SECONDS,
  SESSION_LIFETIME_SECONDS,
  SESSION_RENEWAL_AGE_SECONDS,
  TOKEN_CLOCK_TOLERANCE_SECONDS,
} from './lifetimes.js';
export {
  INTERNAL_TOKEN_ALGORITHM,
  INTERNAL_TOKEN_ISSUERS,
  InternalTokenIssuer,
  KEY_ID_PREFIX_BY_ISSUER,
  audienceOf,
  isKeyIdOfIssuer,
} from './internal-token.js';
export { AuthRateLimit, SignInSlowdown, signInDelayMs } from './rate-limits.js';
export type { RateLimit } from './rate-limits.js';
