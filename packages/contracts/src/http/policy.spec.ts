import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { CallerKind, Freshness, cache, cacheControlHeaderOf, cacheControlOf } from './policy.js';

const FRESHNESSES = Object.values(Freshness);
const SCOPES = ['public', 'private'] as const;

describe('cacheControlOf', () => {
  it.each([
    [Freshness.IMMUTABLE, 'public', 'public, max-age=86400, immutable'],
    [Freshness.IMMUTABLE, 'private', 'private, max-age=86400, immutable'],
    [Freshness.FIVE_MINUTES, 'public', 'public, max-age=300'],
    [Freshness.FIVE_MINUTES, 'private', 'private, max-age=300'],
    [Freshness.MINUTE, 'public', 'public, max-age=60'],
    [Freshness.MINUTE, 'private', 'private, max-age=60'],
    [Freshness.FIFTEEN_SECONDS, 'public', 'public, max-age=15'],
    [Freshness.FIFTEEN_SECONDS, 'private', 'private, max-age=15'],
    [Freshness.NEVER, 'public', 'no-store'],
    [Freshness.NEVER, 'private', 'no-store'],
  ] as const)('gives an anonymous caller the scope of a %s %s policy', (freshness, scope, sent) => {
    expect(cacheControlOf(cache(freshness, { scope }), CallerKind.ANONYMOUS)).toBe(sent);
  });

  it.each([
    [Freshness.IMMUTABLE, 'public', 'private, max-age=86400, immutable'],
    [Freshness.IMMUTABLE, 'private', 'private, max-age=86400, immutable'],
    [Freshness.FIVE_MINUTES, 'public', 'private, max-age=300'],
    [Freshness.FIVE_MINUTES, 'private', 'private, max-age=300'],
    [Freshness.MINUTE, 'public', 'private, max-age=60'],
    [Freshness.MINUTE, 'private', 'private, max-age=60'],
    [Freshness.FIFTEEN_SECONDS, 'public', 'private, max-age=15'],
    [Freshness.FIFTEEN_SECONDS, 'private', 'private, max-age=15'],
    [Freshness.NEVER, 'public', 'no-store'],
    [Freshness.NEVER, 'private', 'no-store'],
  ] as const)('keeps an identified caller private on a %s %s policy', (freshness, scope, sent) => {
    expect(cacheControlOf(cache(freshness, { scope }), CallerKind.IDENTIFIED)).toBe(sent);
  });

  it('never lets an identified caller share an answer, whatever the policy', () => {
    const sent = FRESHNESSES.flatMap((freshness) =>
      SCOPES.map((scope) => cacheControlOf(cache(freshness, { scope }), CallerKind.IDENTIFIED)),
    );

    expect(sent.filter((value) => value.startsWith('public'))).toEqual([]);
  });
});

describe('cacheControlHeaderOf', () => {
  const both = [CallerKind.ANONYMOUS, CallerKind.IDENTIFIED] as const;
  const jsonOf = (schema: z.ZodType): unknown => z.toJSONSchema(schema, { io: 'output' });

  it('declares one value per kind of caller where they differ, saying which goes to whom', () => {
    const header = cacheControlHeaderOf(cache(Freshness.MINUTE, { scope: 'public' }), both);

    expect(jsonOf(header.schema)).toMatchObject({
      anyOf: [
        { const: 'public, max-age=60', description: 'Sent to an anonymous caller.' },
        {
          const: 'private, max-age=60',
          description: 'Sent as soon as a credential identifies the caller.',
        },
      ],
    });
  });

  it('declares the one value when every caller gets it', () => {
    const privateRead = cacheControlHeaderOf(cache(Freshness.MINUTE), both);
    const never = cacheControlHeaderOf(cache(Freshness.NEVER, { scope: 'public' }), both);

    expect(jsonOf(privateRead.schema)).toMatchObject({ const: 'private, max-age=60' });
    expect(jsonOf(never.schema)).toMatchObject({ const: 'no-store' });
  });

  it('declares only the regime of the callers a route lets in', () => {
    const policy = cache(Freshness.MINUTE, { scope: 'public' });

    expect(jsonOf(cacheControlHeaderOf(policy, [CallerKind.ANONYMOUS]).schema)).toMatchObject({
      const: 'public, max-age=60',
    });
    expect(jsonOf(cacheControlHeaderOf(policy, [CallerKind.IDENTIFIED]).schema)).toMatchObject({
      const: 'private, max-age=60',
    });
  });
});
