import { describe, expect, it } from 'vitest';

import { AuthRateLimit } from '@arthome/core';

import type { Api } from './http/index.js';
import { storefrontApi } from './storefront-api/index.js';
import { studioApi } from './studio-api/index.js';

const BUCKETS_WITHOUT_A_CORE_LIMIT: readonly string[] = [
  'auth',
  'contact',
  'export',
  'pairing_create',
  'password-reset',
  'reauth',
  'sales-queue',
];

const bucketsOf = (api: Api): string[] =>
  Object.values(api.routes).flatMap((route) =>
    (route.requires ?? []).flatMap((rule) =>
      rule.name === 'throttle' ? [String((rule.params as { bucket: string }).bucket)] : [],
    ),
  );

describe.each([
  ['storefront', storefrontApi],
  ['studio', studioApi],
] as const)('throttle buckets, %s', (_name, api: Api) => {
  it('is a key of the core limits or a bucket the core has no limit for yet', () => {
    const known = [...Object.keys(AuthRateLimit), ...BUCKETS_WITHOUT_A_CORE_LIMIT];
    expect(bucketsOf(api).filter((bucket) => !known.includes(bucket))).toEqual([]);
  });
});

describe('the buckets without a core limit', () => {
  it('are all still in use', () => {
    const used = [...bucketsOf(storefrontApi), ...bucketsOf(studioApi)];
    expect(BUCKETS_WITHOUT_A_CORE_LIMIT.filter((bucket) => !used.includes(bucket))).toEqual([]);
  });
});
