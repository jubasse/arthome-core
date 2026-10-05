import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { stripping } from './strict.js';

const loose = z.looseObject({ kept: z.string() });
const withExtra = { kept: 'a', extra: 'b' };
const stripped = { kept: 'a' };

const containers: readonly (readonly [string, z.ZodType, unknown, unknown])[] = [
  ['exactOptional', z.object({ a: loose.exactOptional() }), { a: withExtra }, { a: stripped }],
  [
    'pipe',
    z.object({ a: loose.pipe(z.looseObject({ kept: z.string() })) }),
    { a: withExtra },
    { a: stripped },
  ],
  [
    'tuple',
    z.object({ a: z.tuple([z.string(), loose]) }),
    { a: ['x', withExtra] },
    { a: ['x', stripped] },
  ],
  [
    'tuple rest',
    z.object({ a: z.tuple([z.string()], loose) }),
    { a: ['x', withExtra] },
    { a: ['x', stripped] },
  ],
  ['catch', z.object({ a: loose.catch(stripped) }), { a: withExtra }, { a: stripped }],
  ['lazy', z.object({ a: z.lazy(() => loose) }), { a: withExtra }, { a: stripped }],
  ['prefault', z.object({ a: loose.prefault(withExtra) }), {}, { a: stripped }],
  [
    'map',
    z.object({ a: z.map(z.string(), loose) }),
    { a: new Map([['k', withExtra]]) },
    { a: new Map([['k', stripped]]) },
  ],
  ['set', z.object({ a: z.set(loose) }), { a: new Set([withExtra]) }, { a: new Set([stripped]) }],
];

describe('stripping', () => {
  it.each(containers)('reaches a loose object under %s', (_kind, schema, input, expected) => {
    expect(stripping(schema).parse(input)).toEqual(expected);
  });

  it('keeps an exact optional exact', () => {
    const schema = stripping(z.object({ a: z.string().exactOptional() }));

    expect(schema.safeParse({ a: undefined }).success).toBe(false);
    expect(schema.safeParse({}).success).toBe(true);
  });

  it('throws on a container kind it does not know', () => {
    const unknownKind = { _zod: { def: { type: 'bogus' } } } as unknown as z.ZodType;

    expect(() => stripping(z.object({ a: unknownKind }))).toThrow(/"bogus"/);
  });
});
