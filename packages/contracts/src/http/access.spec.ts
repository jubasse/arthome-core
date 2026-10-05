import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import { ApiErrorCode } from '@arthome/core';

import type { PrincipalOf } from './access.js';
import { identity, recentAuth, requirement, roles, throttle } from './access.js';
import { routeBuilder } from './builder.js';
import { defineErrorModel } from './errors.js';
import type { Response } from './index.js';
import { errorCodesOf } from './index.js';
import { restricted, restrictedFieldsOf, sensitive, sensitivePathsOf } from './marks.js';
import { Freshness, cache, DEFAULT_BODY_LIMIT } from './policy.js';
import { accepted } from './responses.js';
import { ReauthProof } from './schemas.js';
import { parseTolerant, tagged } from './tagged.js';

const model = defineErrorModel<string>({
  standard: {},
  envelopeOf: (code) => z.object({ error: z.object({ code: z.literal(code) }) }),
  upstreams: true,
});
const session = { sessionCookie: [] };
const csrf = { sessionCookie: [], csrfToken: [] };
const bearer = { bearerToken: [] };
const viewer = identity('viewer', {
  schemes: { read: [session, bearer], write: [csrf, bearer] },
  principal: z.object({ personId: z.string() }),
  writeErrors: [ApiErrorCode.FORBIDDEN],
});
const rights = {
  name: 'If-Rights-Version',
  in: 'header',
  required: false,
  schema: z.number(),
} as const;
const operator = identity('operator', {
  schemes: { read: [session], write: [session] },
  principal: z.object({ roles: z.array(z.string()) }),
  writeParameters: [rights],
  writeErrors: [ApiErrorCode.RIGHTS_VERSION_STALE],
  responseHeaders: { 'X-Arthome-Rights-Version': { schema: z.number() } },
});
const key = { name: 'Idempotency-Key', in: 'header', required: true, schema: z.string() } as const;
const id = { name: 'id', in: 'path', required: true, schema: z.string() } as const;
const ok = { 200: { description: 'Ok.' } } as const;

const headersOf = (response: Response): Record<string, unknown> => response.headers ?? {};

const base = routeBuilder(model).version(1);

describe('identity', () => {
  it('derives the security of a read and of a write from the identity', () => {
    const builder = base.identity(viewer);
    const read = builder.defineRoute({
      method: 'get',
      path: '/a',
      operationId: 'a',
      responses: ok,
    });
    const write = builder.defineRoute({
      method: 'post',
      path: '/b',
      operationId: 'b',
      responses: ok,
    });

    expect(read.security).toEqual([session, bearer]);
    expect(write.security).toEqual([csrf, bearer]);
    expect(read.access).toEqual({ kind: 'identified', identity: viewer, optional: false });
  });

  it('opens a route with public() and lets an anonymous caller in with optionalAuth()', () => {
    const open = base
      .public()
      .defineRoute({ method: 'get', path: '/a', operationId: 'a', responses: ok });
    const optional = base
      .identity(viewer)
      .optionalAuth()
      .defineRoute({ method: 'get', path: '/b', operationId: 'b', responses: ok });

    expect(open.security).toEqual([]);
    expect(open.access).toEqual({ kind: 'anyone' });
    expect(optional.security).toEqual([session, bearer, {}]);
    expectTypeOf<PrincipalOf<typeof optional.access>>().toEqualTypeOf<{
      personId: string;
    } | null>();
  });

  it('types the principal of an identified route, and has none on a public one', () => {
    const route = base
      .identity(viewer)
      .defineRoute({ method: 'get', path: '/a', operationId: 'a', responses: ok });
    const open = base
      .public()
      .defineRoute({ method: 'get', path: '/b', operationId: 'b', responses: ok });

    expect(route.access.kind).toBe('identified');
    expectTypeOf<PrincipalOf<typeof route.access>>().toEqualTypeOf<{ personId: string }>();
    expect(open.access.kind).toBe('anyone');
    expectTypeOf<PrincipalOf<typeof open.access>>().toEqualTypeOf<undefined>();
  });

  it('refuses a security written by hand beside an identity', () => {
    expect(() =>
      base.identity(viewer).defineRoute({
        method: 'get',
        path: '/a',
        operationId: 'a',
        security: [],
        responses: ok,
      }),
    ).toThrow(/identity writes it/);
  });

  it('adds what an identity carries: write parameters, response headers, its codes', () => {
    const builder = base.identity(operator);
    const write = builder.defineRoute({
      method: 'post',
      path: '/b',
      operationId: 'b',
      responses: ok,
    });
    const read = builder.defineRoute({
      method: 'get',
      path: '/a',
      operationId: 'a',
      responses: ok,
    });

    expect(write.parameters.map((parameter) => parameter.name)).toEqual(['If-Rights-Version']);
    expect(read.parameters ?? []).toEqual([]);
    expect(Object.keys(headersOf(write.responses[200]))).toContain('X-Arthome-Rights-Version');
    expect(Object.keys(write.responses)).toContain('403');
  });
});

describe('derived errors', () => {
  const builder = base.identity(viewer);

  it('answers 400 for an input, 413 and 415 for a body, 409 for an idempotency key', () => {
    const route = builder.defineRoute({
      method: 'post',
      path: '/a/{id}',
      operationId: 'a',
      parameters: [id, key],
      requestBody: { content: { 'application/json': { schema: z.object({}) } } },
      responses: ok,
    });

    expect(Object.keys(route.responses).sort()).toEqual(
      ['200', '400', '401', '403', '409', '413', '415', '500', '502', '504'].sort(),
    );
    expect(route.bodyLimit).toBe(DEFAULT_BODY_LIMIT);
    expect(Object.keys(headersOf(route.responses[200]))).toContain('Idempotency-Replayed');
  });

  it('adds no 400 to a route with no input, and no 401 to a public one', () => {
    const route = base
      .public()
      .defineRoute({ method: 'get', path: '/a', operationId: 'a', responses: ok });

    expect(Object.keys(route.responses).sort()).toEqual(['200', '500', '502', '504']);
  });

  it('keeps a response the route writes whole over the derived one', () => {
    const mine = { description: 'Mine.' };
    const route = builder.defineRoute({
      method: 'get',
      path: '/a',
      operationId: 'a',
      responses: { ...ok, 401: mine },
    });

    expect(route.responses[401]).toBe(mine);
  });

  it('merges the codes of a rule into its status', () => {
    const route = builder
      .requires(roles('production').on('channelId'), recentAuth(), throttle('auth'))
      .defineRoute({
        method: 'post',
        path: '/a',
        operationId: 'a',
        requestBody: { content: { 'application/json': { schema: ReauthProof } } },
        responses: ok,
      });

    expect(Object.keys(route.responses)).toEqual(expect.arrayContaining(['403', '429']));
    expect(route.requires?.map((rule) => rule.name)).toEqual(['roles', 'recentAuth', 'throttle']);
    expect(route.requires?.[0]?.params).toEqual({ allowed: ['production'], on: 'channelId' });
  });

  it('adds the codes of a rule the route requires itself', () => {
    const route = builder.defineRoute({
      method: 'post',
      path: '/a',
      operationId: 'a',
      requires: [recentAuth()],
      requestBody: { content: { 'application/json': { schema: ReauthProof } } },
      responses: ok,
    });

    expect(errorCodesOf(route, 403)).toContain(ApiErrorCode.REAUTHENTICATION_REQUIRED);
  });

  it('refuses a route whose body lacks the proof a rule reads', () => {
    const define = (): unknown =>
      builder.requires(recentAuth()).defineRoute({
        method: 'post',
        path: '/a',
        operationId: 'a',
        requestBody: {
          content: { 'application/json': { schema: z.object({ name: z.string() }) } },
        },
        responses: ok,
      });

    expect(define).toThrow('reads the body field "reauthToken"');
  });

  it('marks the routes of an internal identity internal, with the deadline of a service', () => {
    const deadline = {
      name: 'X-Deadline',
      in: 'header',
      required: true,
      schema: z.string(),
    } as const;
    const service = identity('service', {
      schemes: { read: [{ internalToken: [] }], write: [{ internalToken: [] }] },
      principal: z.object({ service: z.string() }),
      parameters: [deadline],
      internal: true,
    });
    const flat = defineErrorModel<string>({ standard: {}, envelopeOf: model.envelopeOf });
    const route = routeBuilder(flat)
      .version(1)
      .identity(service)
      .defineRoute({ method: 'get', path: '/a', operationId: 'a', responses: ok });

    expect(route.internal).toBe(true);
    expect(route.parameters.map((parameter) => parameter.name)).toEqual(['X-Deadline']);
    expect(Object.keys(route.responses)).toContain('504');
  });
});

describe('policies', () => {
  it('reads the budget, the body ceiling and the cache from the route', () => {
    const route = base
      .public()
      .budget(400)
      .bodyLimit(2_097_152)
      .cache(cache(Freshness.FIVE_MINUTES, { scope: 'public', vary: ['Authorization'] }))
      .defineRoute({
        method: 'get',
        path: '/a',
        operationId: 'a',
        responses: ok,
      });

    expect(route.budgetMs).toBe(400);
    expect(route.cache?.maxAgeSeconds).toBe(300);
    expect(Object.keys(headersOf(route.responses[200]))).toEqual(['Cache-Control', 'Vary']);
  });

  it('declares a rule through requirement()', () => {
    const rule = requirement('custom', {
      params: { level: 2 },
      errors: [ApiErrorCode.FORBIDDEN],
    });

    expect(rule.params).toEqual({ level: 2 });
  });
});

describe('marks', () => {
  const schema = z.object({
    reauthToken: sensitive(z.string()),
    data: z.object({
      revenue: restricted(z.number(), 'canRevenue'),
      streamKey: sensitive(z.string()).nullable(),
    }),
    items: z.array(z.object({ secret: sensitive(z.string()) })),
  });

  it('says where the sensitive fields and the restricted fields are', () => {
    expect(sensitivePathsOf(schema)).toEqual(['reauthToken', 'data.streamKey', 'items[].secret']);
    expect(restrictedFieldsOf(schema)).toEqual([{ path: 'data.revenue', right: 'canRevenue' }]);
  });

  it('parses a schema as it did, and writes the mark in the document', () => {
    expect(
      schema.safeParse({ reauthToken: 'a', data: { streamKey: null }, items: [] }).success,
    ).toBe(true);
    expect(z.toJSONSchema(sensitive(z.string()))).toMatchObject({
      format: 'password',
      'x-arthome-sensitive': true,
    });
  });

  it('keeps a response that carries a secret out of every cache', () => {
    const route = base.public().defineRoute({
      method: 'post',
      path: '/a',
      operationId: 'a',
      responses: { 200: { description: 'Ok.', content: { 'application/json': { schema } } } },
    });

    expect(Object.keys(headersOf(route.responses[200]))).toContain('Cache-Control');
  });
});

describe('tagged', () => {
  const Succeeded = z.object({ receipt: z.string() });
  const Declined = z.object({ declineCode: z.string() });
  const Outcome = tagged('outcome', { succeeded: Succeeded, declined: Declined });

  it('parses a declared variant strictly, and refuses an unknown one', () => {
    expect(Outcome.safeParse({ outcome: 'succeeded', receipt: 'r' }).success).toBe(true);
    expect(Outcome.safeParse({ outcome: 'later', receipt: 'r' }).success).toBe(false);
  });

  it('is tolerant on the read side: an unknown variant is kept raw and named', () => {
    const read = parseTolerant(z.object({ data: Outcome }), { data: { outcome: 'later', x: 1 } });
    const bad = parseTolerant(z.object({ data: Outcome }), { data: { outcome: 'declined' } });

    expect(read).toEqual({
      ok: true,
      value: { data: { outcome: 'later', x: 1 } },
      unknownVariants: ['later'],
    });
    expect(bad.ok).toBe(false);
  });

  it('writes a oneOf with its discriminator', () => {
    const json = z.toJSONSchema(Outcome) as {
      oneOf?: unknown[];
      discriminator?: { propertyName: string };
    };

    expect(json.oneOf).toHaveLength(2);
    expect(json.discriminator).toEqual({ propertyName: 'outcome' });
  });

  it('shares one schema between two tag values', () => {
    const shared = tagged('mode', { bearer: Succeeded, device: Succeeded, cookie: Declined });

    expect(shared.safeParse({ mode: 'device', receipt: 'r' }).success).toBe(true);
    expect(shared.safeParse({ mode: 'cookie', declineCode: 'd' }).success).toBe(true);
  });
});

describe('accepted', () => {
  it('names the operation that reports the outcome, and when to ask again', () => {
    const response = accepted({ operation: 'getExport' });

    expect(Object.keys(response.headers ?? {})).toEqual(['Location', 'Retry-After']);
    expect(response['x-arthome-operation']).toBe('getExport');
  });
});
