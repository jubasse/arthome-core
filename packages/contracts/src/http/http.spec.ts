import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ApiErrorCode } from '@arthome/core';

import {
  accessorOf,
  defineApi,
  defineErrorModel,
  defineRoute,
  headersSchemaOf,
  paramsSchemaOf,
  querySchemaOf,
  routeBuilder,
  versionedPath,
  successStatusOf,
  type RouteQuery,
} from './index.js';

const criteria = z.object({
  genreIds: z.array(z.string()).optional(),
  priceMaxMinor: z.int().optional(),
  onPromotion: z.boolean().optional(),
});

const listDates = defineRoute({
  method: 'get',
  version: 1,
  path: '/channels/{channelId}/dates',
  operationId: 'listDates',
  parameters: [
    { name: 'channelId', in: 'path', required: true, schema: z.string() },
    { name: 'X-Arthome-Surface', in: 'header', required: true, schema: z.enum(['web', 'tv']) },
    { name: 'q', in: 'query', schema: z.string().min(2) },
    { name: 'limit', in: 'query', schema: z.int().min(1).max(50).default(20) },
    { name: 'filters', in: 'query', schema: criteria },
  ],
  responses: {
    200: { description: 'The dates.' },
    201: { description: 'Never, but a lower 2xx must win.' },
    400: { description: 'Refused.' },
  },
});

async function issuesOf(schema: z.ZodType, value: unknown): Promise<readonly string[]> {
  const result = await schema['~standard'].validate(value);
  return 'issues' in result && result.issues !== undefined
    ? result.issues.map((issue) => (issue.path ?? []).map(String).join('.'))
    : [];
}

describe('querySchemaOf', () => {
  it('decodes what a query string carries into the contract’s types', () => {
    const query: RouteQuery<typeof listDates> = querySchemaOf(listDates).parse({
      genreIds: 'dance',
      priceMaxMinor: '2000',
      onPromotion: 'true',
      limit: '12',
    });

    expect(query).toEqual({
      genreIds: ['dance'],
      priceMaxMinor: 2000,
      onPromotion: true,
      limit: 12,
    });
  });

  it('reads an object parameter’s fields at the top of the query, as `explode` sends them', () => {
    expect(Object.keys(querySchemaOf(listDates).parse({ genreIds: ['a', 'b'] }))).toEqual([
      'genreIds',
    ]);
  });

  it('leaves a default to the service that answers, so a relay forwards only what it received', () => {
    expect(querySchemaOf(listDates).parse({ q: 'nuit' })).toEqual({ q: 'nuit' });
  });

  it('refuses an undeclared parameter by its name', async () => {
    expect(await issuesOf(querySchemaOf(listDates), { page: '2', q: 'n' })).toEqual(['q', 'page']);
  });
});

describe('headersSchemaOf', () => {
  it('validates a declared header under the lowercase name Node gives it, and keeps the others', async () => {
    const headers = headersSchemaOf(listDates);

    expect(headers.parse({ 'x-arthome-surface': 'tv', host: 'arthome' })).toEqual({
      'x-arthome-surface': 'tv',
      host: 'arthome',
    });
    expect(await issuesOf(headers, { 'x-arthome-surface': 'studio' })).toEqual([
      'x-arthome-surface',
    ]);
  });
});

describe('paramsSchemaOf', () => {
  it('validates the path parameters', () => {
    expect(paramsSchemaOf(listDates).parse({ channelId: 'c1' })).toEqual({ channelId: 'c1' });
  });
});

describe('successStatusOf', () => {
  it('answers with the lowest 2xx the route declares', () => {
    expect(successStatusOf(listDates)).toBe(200);
  });
});

describe('defineApi', () => {
  it('refuses a route filed under another operation’s id, since a client method is named by it', () => {
    expect(() =>
      defineApi({
        openapi: '3.1.1',
        info: { title: 'test', version: '1' },
        routes: { getDates: listDates },
        components: {},
      }),
    ).toThrow(/listDates/);
  });
});

describe('accessorOf', () => {
  it('names each member in capitals, from the one list that declares them', () => {
    expect(accessorOf(['chat', 'payment_method'] as const)).toEqual({
      CHAT: 'chat',
      PAYMENT_METHOD: 'payment_method',
    });
  });
});

describe('routeBuilder', () => {
  const surface = {
    name: 'X-Arthome-Surface',
    in: 'header',
    required: true,
    schema: z.string(),
  } as const;
  const model = defineErrorModel<string>({
    standard: {},
    envelopeOf: (code) => z.object({ error: z.object({ code: z.literal(code) }) }),
  });
  const base = routeBuilder(model)
    .version(1)
    .public()
    .tags('dates')
    .headers(surface)
    .errors([ApiErrorCode.NOT_FOUND]);

  it('never changes the builder it is called on', () => {
    const derived = base.tags('other').errors([ApiErrorCode.FORBIDDEN]);

    const kept = base.defineRoute({
      method: 'get',
      path: '/dates',
      operationId: 'listDates',
      responses: { 200: { description: 'Dates.' } },
    });
    const changed = derived.defineRoute({
      method: 'get',
      path: '/dates',
      operationId: 'listDatesAgain',
      responses: { 200: { description: 'Dates.' } },
    });

    expect(Object.keys(kept.responses)).toEqual(['200', '400', '404', '500']);
    expect(kept.tags).toEqual(['dates']);
    expect(Object.keys(changed.responses)).toEqual(['200', '400', '403', '404', '500']);
    expect(changed.tags).toEqual(['other']);
  });

  it('puts the builder headers after the route own parameters, and the route over its errors', () => {
    const route = base.defineRoute({
      method: 'get',
      path: '/dates/{dateId}',
      operationId: 'getDate',
      tags: ['own'],
      parameters: [{ name: 'dateId', in: 'path', required: true, schema: z.string() }],
      responses: { 200: { description: 'Date.' }, 400: { description: 'Bad date.' } },
    });

    expect(route.parameters.map((parameter) => parameter.name)).toEqual([
      'dateId',
      'X-Arthome-Surface',
    ]);
    expect(route.tags).toEqual(['own']);
    expect(route.responses[400].description).toBe('Bad date.');
    expect(route.version).toBe(1);
    expect(versionedPath(route)).toBe('/v1/dates/{dateId}');
  });

  it('derives api.schema_invalid from a required header, and not from an optional one', () => {
    const define = (headers: readonly (typeof surface)[]) =>
      routeBuilder(model)
        .version(1)
        .public()
        .headers(...headers)
        .defineRoute({
          method: 'get',
          path: '/dates',
          operationId: 'listDates',
          responses: { 200: { description: 'Dates.' } },
        }) as unknown as { readonly errorCodes: Record<string, readonly string[] | undefined> };
    const optional = { ...surface, required: false } as unknown as typeof surface;

    expect(define([surface]).errorCodes['400']).toEqual([ApiErrorCode.SCHEMA_INVALID]);
    expect(define([]).errorCodes['400']).toBeUndefined();
    expect(define([optional]).errorCodes['400']).toBeUndefined();
  });

  it('refuses a route before a version is set', () => {
    const unversioned = routeBuilder(model).public() as unknown as typeof base;

    expect(() =>
      unversioned.defineRoute({
        method: 'get',
        path: '/dates',
        operationId: 'listDates',
        responses: { 200: { description: 'Dates.' } },
      }),
    ).toThrow(/no version/);
  });
});

describe('versions', () => {
  const answer = { 200: { description: 'Ok.' } };

  it('names version 1 bare and a later version with its suffix', () => {
    const v2 = defineRoute({
      method: 'get',
      version: 2,
      path: '/dates',
      operationId: 'listDatesV2',
      responses: answer,
    });

    expect(versionedPath(v2)).toBe('/v2/dates');
    expect(() =>
      defineRoute({
        method: 'get',
        version: 2,
        path: '/dates',
        operationId: 'listDates',
        responses: answer,
      }),
    ).toThrow(/suffix "V\{n\}"/);
    expect(() =>
      defineRoute({
        method: 'get',
        version: 1,
        path: '/dates',
        operationId: 'listDatesV2',
        responses: answer,
      }),
    ).toThrow(/bare operation id/);
  });

  it('serves a version beside the previous one, and refuses the same address twice', () => {
    const v1 = defineRoute({
      method: 'get',
      version: 1,
      path: '/dates',
      operationId: 'listDates',
      responses: answer,
    });
    const v2 = defineRoute({
      method: 'get',
      version: 2,
      path: '/dates',
      operationId: 'listDatesV2',
      responses: answer,
    });
    const again = defineRoute({
      method: 'get',
      version: 1,
      path: '/dates',
      operationId: 'listDatesAgain',
      responses: answer,
    });
    const info = { title: 'test', version: '1' };

    expect(() =>
      defineApi({
        openapi: '3.1.1',
        info,
        routes: { listDates: v1, listDatesV2: v2 },
        components: {},
      }),
    ).not.toThrow();
    expect(() =>
      defineApi({
        openapi: '3.1.1',
        info,
        routes: { listDates: v1, listDatesAgain: again },
        components: {},
      }),
    ).toThrow(/declared twice/);
  });
});
