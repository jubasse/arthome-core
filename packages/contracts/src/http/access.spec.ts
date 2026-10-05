import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import { ApiErrorCode } from '@arthome/core';

import type { PrincipalOf } from './access.js';
import { identity, recentAuthOver, requirement, roles, throttle } from './access.js';
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
const recentAuth = recentAuthOver(['delete_channel', 'reveal_stream_key'] as const);
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

  it('lets a write skip the CSRF token with a stated reason, and keeps the reason on the route', () => {
    const exempt = base.identity(viewer, { csrfExempt: 'a lost CSRF cookie must not block it' });
    const write = exempt.defineRoute({
      method: 'post',
      path: '/b',
      operationId: 'b',
      responses: ok,
    });

    expect(write.security).toEqual([session, bearer]);
    expect(Object.keys(write.responses)).not.toContain('403');
    expect(write.access).toEqual({
      kind: 'identified',
      identity: viewer,
      optional: false,
      csrfExempt: 'a lost CSRF cookie must not block it',
    });
  });

  it('drops the identity write parameters from a csrfExempt write, as it drops its write codes', () => {
    const define = (method: 'get' | 'post', exempt: boolean) =>
      base
        .identity(operator, exempt ? { csrfExempt: 'it opens a session' } : undefined)
        .defineRoute({ method, path: '/b', operationId: 'b', responses: ok });
    const namesOf = (route: { readonly parameters?: readonly { readonly name: string }[] }) =>
      (route.parameters ?? []).map((parameter) => parameter.name);

    expect(namesOf(define('post', false))).toContain('If-Rights-Version');
    expect(namesOf(define('post', true))).not.toContain('If-Rights-Version');
  });

  it('lets an optional route treat a refused credential as none with a stated reason, and derives no 401', () => {
    const write = base
      .identity(viewer, { csrfExempt: 'a lost CSRF cookie must not block it' })
      .optionalAuth({ refusedCredentialIsAnonymous: 'signing out is idempotent' })
      .defineRoute({ method: 'post', path: '/b', operationId: 'b', responses: ok });

    expect(write.security).toEqual([session, bearer, {}]);
    expect(Object.keys(write.responses)).not.toContain('401');
    expect(write.access).toEqual({
      kind: 'identified',
      identity: viewer,
      optional: true,
      csrfExempt: 'a lost CSRF cookie must not block it',
      refusedCredentialIsAnonymous: 'signing out is idempotent',
    });
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

  it('refuses a security written by hand, at compile time and at run time', () => {
    expect(() =>
      base.identity(viewer).defineRoute({
        method: 'get',
        path: '/a',
        operationId: 'a',
        // @ts-expect-error the access writes the security
        security: [],
        responses: ok,
      }),
    ).toThrow(/its access writes it/);
  });

  it('refuses a route whose builder has no access, at compile time and at run time', () => {
    expect(() =>
      // @ts-expect-error a route needs .identity(...) or .public()
      base.defineRoute({ method: 'get', path: '/a', operationId: 'a', responses: ok }),
    ).toThrow(/has no access/);
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
      ['200', '400', '401', '403', '409', '413', '415', '500', '502', '503', '504'].sort(),
    );
    expect(route.bodyLimit).toBe(DEFAULT_BODY_LIMIT);
    expect(Object.keys(headersOf(route.responses[200]))).toContain('Idempotency-Replayed');
  });

  it('declares the instant of a replay beside its marker, on the writes that can replay only', () => {
    const write = (parameters: readonly (typeof key)[]): Response =>
      builder.defineRoute({
        method: 'post',
        path: '/a',
        operationId: 'a',
        parameters,
        responses: { 201: { description: 'Created.' } },
      }).responses[201];

    expect(Object.keys(headersOf(write([key])))).toEqual([
      'Idempotency-Replayed',
      'X-Arthome-Served-At',
    ]);
    expect(headersOf(write([]))).toEqual({});
  });

  it('adds no 400 to a route with no input, and no 401 to a public one', () => {
    const route = base
      .public()
      .defineRoute({ method: 'get', path: '/a', operationId: 'a', responses: ok });

    expect(Object.keys(route.responses).sort()).toEqual(['200', '500', '502', '503', '504']);
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
      .requires(
        roles('production').on('channelId'),
        recentAuth({ intent: 'delete_channel' }),
        throttle('auth'),
      )
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
      requires: [recentAuth({ intent: 'delete_channel' })],
      requestBody: { content: { 'application/json': { schema: ReauthProof } } },
      responses: ok,
    });

    expect(errorCodesOf(route, 403)).toContain(ApiErrorCode.REAUTHENTICATION_REQUIRED);
  });

  it('binds a re-authentication to the one intent the route names, and refuses a route that names none', () => {
    expect(recentAuth({ intent: 'reveal_stream_key' }).params).toEqual({
      intent: 'reveal_stream_key',
      proof: { in: 'body', name: 'reauthToken' },
    });
    // @ts-expect-error a re-authentication names the command its token was minted for.
    expect(() => recentAuth()).toThrow();
    // @ts-expect-error an intent outside the surface's intents does not compile, and throws when it loads.
    expect(() => recentAuth({ intent: 'rotate_stream_key' })).toThrow('"rotate_stream_key"');
  });

  it('refuses a route whose body lacks the proof a rule reads', () => {
    const define = (): unknown =>
      builder.requires(recentAuth({ intent: 'delete_channel' })).defineRoute({
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

  it('declares the Cache-Control of every caller the access lets in, private once identified', () => {
    const shared = cache(Freshness.MINUTE, { scope: 'public' });
    const read = { method: 'get', path: '/a', operationId: 'a', responses: ok } as const;
    const sentBy = (route: { readonly responses: Readonly<Record<string, Response>> }): unknown => {
      const header = route.responses[200]?.headers?.['Cache-Control'];
      return header === undefined ? undefined : z.toJSONSchema(header.schema, { io: 'output' });
    };

    expect(sentBy(base.public().cache(shared).defineRoute(read))).toMatchObject({
      const: 'public, max-age=60',
    });
    expect(sentBy(base.identity(viewer).cache(shared).defineRoute(read))).toMatchObject({
      const: 'private, max-age=60',
    });
    expect(
      sentBy(base.identity(viewer).optionalAuth().cache(shared).defineRoute(read)),
    ).toMatchObject({
      anyOf: [{ const: 'public, max-age=60' }, { const: 'private, max-age=60' }],
    });
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

  it('writes a shared tag as a plain string, and lends the metadata of a declared tag field', () => {
    const Documented = z.object({
      mode: z.string().describe('Narrowed to the token modes.'),
      token: z.string(),
    });
    const own = tagged('mode', { bearer: Documented, device: Documented, cookie: Declined });
    const json = z.toJSONSchema(own) as { oneOf: { properties: Record<string, unknown> }[] };

    expect(own.safeParse({ mode: 'device', token: 't' }).success).toBe(true);
    expect(own.safeParse({ mode: 'later', token: 't' }).success).toBe(false);
    expect(json.oneOf[0]?.properties.mode).toEqual({
      type: 'string',
      description: 'Narrowed to the token modes.',
    });
  });
});

describe('accepted', () => {
  it('names the operation that reports the outcome, and when to ask again', () => {
    const response = accepted({ operation: 'getExport' });

    expect(Object.keys(response.headers ?? {})).toEqual(['Location', 'Retry-After']);
    expect(response['x-arthome-operation']).toBe('getExport');
  });
});
