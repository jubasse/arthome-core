import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { restricted, restrictedFieldsOf, sensitive, sensitivePathsOf } from './marks.js';

const secret = sensitive(z.string());

const containers: readonly (readonly [string, z.ZodType, string])[] = [
  ['exactOptional', z.object({ a: secret.exactOptional() }), 'a'],
  ['pipe', z.object({ a: secret.pipe(z.string()) }), 'a'],
  ['transform', z.object({ a: secret.transform((value) => value) }), 'a'],
  ['tuple', z.object({ a: z.tuple([z.string(), secret]) }), 'a[1]'],
  ['tuple rest', z.object({ a: z.tuple([z.string()], secret) }), 'a[]'],
  ['catch', z.object({ a: secret.catch('x') }), 'a'],
  ['lazy', z.object({ a: z.lazy(() => secret) }), 'a'],
  ['prefault', z.object({ a: secret.prefault('x') }), 'a'],
  ['nonoptional', z.object({ a: secret.optional().pipe(secret).nonoptional() }), 'a'],
  ['map', z.object({ a: z.map(z.string(), secret) }), 'a.*'],
  ['set', z.object({ a: z.set(secret) }), 'a[]'],
  ['catchall', z.object({ a: z.object({}).catchall(secret) }), 'a.*'],
];

describe('the mark walkers', () => {
  it.each(containers)('find a mark under %s', (_kind, schema, path) => {
    expect(sensitivePathsOf(schema)).toContain(path);
  });

  it('find a restricted field under a container they once treated as a leaf', () => {
    const schema = z.object({ a: z.tuple([restricted(z.number(), 'canRevenue')]) });

    expect(restrictedFieldsOf(schema)).toEqual([{ path: 'a[0]', right: 'canRevenue' }]);
  });

  it('report each path of a schema instance reused in two fields', () => {
    const shared = z.object({ token: secret });
    const schema = z.object({ first: shared, second: shared.optional() });

    expect(sensitivePathsOf(schema)).toEqual(['first.token', 'second.token']);
  });

  it('end on a schema that contains itself', () => {
    const node: z.ZodType = z.object({ token: secret, child: z.lazy(() => node).optional() });

    expect(sensitivePathsOf(node)).toEqual(['token']);
  });

  it('throw on a container kind they do not know', () => {
    const unknownKind = { _zod: { def: { type: 'bogus' } } } as unknown as z.ZodType;

    expect(() => sensitivePathsOf(z.object({ a: unknownKind }))).toThrow(/"bogus"/);
  });
});
