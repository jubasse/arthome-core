import { describe, expect, it } from 'vitest';

import {
  INTERNAL_TOKEN_ISSUERS,
  InternalTokenIssuer,
  KEY_ID_PREFIX_BY_ISSUER,
  audienceOf,
  isKeyIdOfIssuer,
} from './internal-token.js';
import {
  GENERATED_HANDLE_ALPHABET,
  GENERATED_HANDLE_RANDOM_LENGTH,
  generatedPublicHandle,
} from './public-handle.js';
import { AuthRateLimit, SignInSlowdown, limitForAddress, signInDelayMs } from './rate-limits.js';
import { PublicHandleSchema } from '../schema/identifiers.js';
import { InternalTokenClaimsSchema } from '../schema/internal-token.js';
import { Service } from '../vocabulary/people.js';

const ACCOUNT = '019928f4-1b6c-7c3a-9f2e-6a1d0c4b8e77';

describe('a generated public handle', () => {
  it('has 32 distinct symbols, so five bits of a byte pick one without bias', () => {
    expect(new Set(GENERATED_HANDLE_ALPHABET).size).toBe(32);
    expect(GENERATED_HANDLE_ALPHABET).toHaveLength(32);
  });

  it('passes the published handle pattern at both ends of the alphabet', () => {
    for (const fill of [0x00, 0xff, 0x1f, 0xe0]) {
      const handle = generatedPublicHandle(
        new Uint8Array(GENERATED_HANDLE_RANDOM_LENGTH).fill(fill),
      );
      expect(PublicHandleSchema.safeParse(handle).success).toBe(true);
    }
  });

  it('depends on every byte it reads, and only on the first eight', () => {
    const bytes = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 99]);
    const handle = generatedPublicHandle(bytes);
    for (let index = 0; index < GENERATED_HANDLE_RANDOM_LENGTH; index += 1) {
      const changed = Uint8Array.from(bytes);
      changed[index] = (changed[index] ?? 0) + 1;
      expect(generatedPublicHandle(changed)).not.toBe(handle);
    }
    expect(generatedPublicHandle(bytes.subarray(0, GENERATED_HANDLE_RANDOM_LENGTH))).toBe(handle);
  });

  it('refuses too few bytes rather than a short handle', () => {
    expect(() => generatedPublicHandle(new Uint8Array(GENERATED_HANDLE_RANDOM_LENGTH - 1))).toThrow(
      RangeError,
    );
  });
});

describe('the internal token', () => {
  it('is addressed to one service at a time', () => {
    expect(audienceOf(Service.TICKETING)).not.toBe(audienceOf(Service.PAYOUTS));
    expect(audienceOf(Service.IDENTITY)).toBe(`arthome.${Service.IDENTITY}`);
  });

  it('binds each issuer to its own key prefix, and to no other', () => {
    for (const issuer of INTERNAL_TOKEN_ISSUERS) {
      const own = `${KEY_ID_PREFIX_BY_ISSUER[issuer]}2026-10-03`;
      expect(isKeyIdOfIssuer(own, issuer)).toBe(true);
      for (const other of INTERNAL_TOKEN_ISSUERS.filter((candidate) => candidate !== issuer)) {
        expect(isKeyIdOfIssuer(own, other)).toBe(false);
      }
    }
    expect(isKeyIdOfIssuer('dev-2026-10-03', InternalTokenIssuer.STOREFRONT_BFF)).toBe(false);
    expect(isKeyIdOfIssuer(undefined, InternalTokenIssuer.STOREFRONT_BFF)).toBe(false);
  });

  it('carries an account, or none for an anonymous visitor', () => {
    const anonymous = {
      iss: InternalTokenIssuer.STOREFRONT_BFF,
      aud: audienceOf(Service.CATALOG),
      iat: 1_790_000_000,
      exp: 1_790_000_060,
    };
    expect(InternalTokenClaimsSchema.parse(anonymous).sub).toBeUndefined();
    expect(InternalTokenClaimsSchema.parse({ ...anonymous, sub: ACCOUNT }).sub).toBe(ACCOUNT);
  });

  it('refuses an issuer outside the two BFFs and a malformed account', () => {
    const claims = {
      iss: InternalTokenIssuer.STUDIO_BFF,
      aud: audienceOf(Service.CATALOG),
      iat: 1_790_000_000,
      exp: 1_790_000_060,
    };
    expect(
      InternalTokenClaimsSchema.safeParse({ ...claims, iss: 'arthome.identity' }).success,
    ).toBe(false);
    expect(InternalTokenClaimsSchema.safeParse({ ...claims, sub: 'not-a-uuid' }).success).toBe(
      false,
    );
  });

  it('keeps a claim a later slice adds', () => {
    const parsed = InternalTokenClaimsSchema.parse({
      iss: InternalTokenIssuer.STUDIO_BFF,
      aud: audienceOf(Service.CATALOG),
      iat: 1_790_000_000,
      exp: 1_790_000_060,
      chn: ['a-channel'],
    });
    expect(parsed).toHaveProperty('chn');
  });
});

describe('the per-address caps, by address family', () => {
  it('set a high ceiling on an IPv4 address and keep the /64 tight', () => {
    expect(limitForAddress(AuthRateLimit.SIGN_IN_PER_ADDRESS, true)).toBe(300);
    expect(limitForAddress(AuthRateLimit.SIGN_UP_PER_ADDRESS, true)).toBe(60);
    expect(limitForAddress(AuthRateLimit.SIGN_IN_PER_ADDRESS, false)).toBe(20);
    expect(limitForAddress(AuthRateLimit.SIGN_UP_PER_ADDRESS, false)).toBe(10);
  });

  it('use the one limit for both families where no IPv4 ceiling is set', () => {
    const cap = AuthRateLimit.EMAIL_VERIFICATION_CONFIRM_PER_ADDRESS;
    expect(limitForAddress(cap, true)).toBe(cap.limit);
    expect(limitForAddress(cap, false)).toBe(cap.limit);
  });
});

describe('the slow-down on an email’s failed sign-ins', () => {
  it('costs nothing for the first failures, then doubles, and never passes its ceiling', () => {
    expect(signInDelayMs(0)).toBe(0);
    expect(signInDelayMs(SignInSlowdown.FREE_FAILURES)).toBe(0);
    expect(signInDelayMs(SignInSlowdown.FREE_FAILURES + 1)).toBe(SignInSlowdown.FIRST_DELAY_MS);
    expect(signInDelayMs(SignInSlowdown.FREE_FAILURES + 2)).toBe(2 * SignInSlowdown.FIRST_DELAY_MS);
    expect(signInDelayMs(10_000)).toBe(SignInSlowdown.MAX_DELAY_MS);
  });
});
