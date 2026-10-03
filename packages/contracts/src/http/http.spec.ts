import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  defineApi,
  defineRoute,
  headersSchemaOf,
  paramsSchemaOf,
  querySchemaOf,
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
  path: '/v1/channels/{channelId}/dates',
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
