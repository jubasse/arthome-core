import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import type { ApiErrorCode } from '@arthome/core';
import { DomainErrorCode, OrderErrorCode } from '@arthome/core';
import type { ErrorParamsRead } from '@arthome/core/schema';

import { createClient, UndeclaredStatusError, type FetchInit } from './index.js';
import { defineApi, defineRoute } from '../http/index.js';
import { operator, studioV1 } from '../studio-api/components.js';

const Dates = z.looseObject({ items: z.array(z.string()) });

const listDates = defineRoute({
  method: 'get',
  version: 1,
  path: '/channels/{channelId}/dates',
  operationId: 'listDates',
  parameters: [
    { name: 'channelId', in: 'path', required: true, schema: z.string() },
    { name: 'X-Arthome-Surface', in: 'header', required: true, schema: z.enum(['web', 'tv']) },
    { name: 'genreIds', in: 'query', schema: z.array(z.string()) },
    { name: 'free', in: 'query', schema: z.boolean() },
  ],
  responses: {
    200: { description: 'The dates.', content: { 'application/json': { schema: Dates } } },
    404: { description: 'No such channel.' },
  },
});

const renameDate = defineRoute({
  method: 'post',
  version: 1,
  path: '/dates/{dateId}/title',
  operationId: 'renameDate',
  parameters: [{ name: 'dateId', in: 'path', required: true, schema: z.string() }],
  requestBody: {
    required: true,
    content: { 'application/json': { schema: z.object({ title: z.string() }) } },
  },
  responses: { 204: { description: 'Renamed.' } },
});

const api = defineApi({
  openapi: '3.1.1',
  info: { title: 'test', version: '1' },
  routes: { listDates, renameDate },
  components: {},
});

interface Sent {
  url: string;
  init: FetchInit & { tag?: string };
}

function answering(
  status: number,
  body: string,
): {
  sent: Sent[];
  fetch: (
    url: string,
    init: FetchInit & { tag?: string },
  ) => Promise<{
    status: number;
    headers: { get(name: string): string | null };
    text(): Promise<string>;
  }>;
} {
  const sent: Sent[] = [];
  return {
    sent,
    fetch: (url, init) => {
      sent.push({ url, init });
      return Promise.resolve({
        status,
        headers: { get: (name) => (name === 'content-type' ? 'application/json' : null) },
        text: () => Promise.resolve(body),
      });
    },
  };
}

describe('createClient', () => {
  it('writes the path, the query as the contract serialises it, and the headers', async () => {
    const server = answering(200, '{"items":["d1"]}');
    const client = createClient(api, {
      baseUrl: 'https://api.test/',
      fetch: server.fetch,
      headers: { 'X-Arthome-Surface': 'tv' },
    });

    const response = await client.listDates({
      params: { channelId: 'c 1' },
      query: { genreIds: ['dance', 'opera'], free: true },
      init: { tag: 'kept' },
    });

    expect(server.sent[0]?.url).toBe(
      'https://api.test/v1/channels/c%201/dates?genreIds=dance&genreIds=opera&free=true',
    );
    expect(server.sent[0]?.init).toMatchObject({
      method: 'GET',
      headers: { 'X-Arthome-Surface': 'tv' },
      tag: 'kept',
    });
    if (response.status === 200) expect(response.body.items).toEqual(['d1']);
    expect(response.status).toBe(200);
  });

  it('sends a JSON body and reads an empty answer as no body', async () => {
    const server = answering(204, '');
    const client = createClient(api, { baseUrl: 'https://api.test', fetch: server.fetch });

    const response = await client.renameDate({ params: { dateId: 'd1' }, body: { title: 'Nuit' } });

    expect(server.sent[0]?.init).toMatchObject({
      method: 'POST',
      body: '{"title":"Nuit"}',
      headers: { 'content-type': 'application/json' },
    });
    expect(response).toMatchObject({ status: 204, body: undefined });
  });

  it('refuses to type a status the route does not declare', async () => {
    const client = createClient(api, {
      baseUrl: 'https://api.test',
      fetch: answering(418, '{"error":{}}').fetch,
    });

    await expect(client.listDates({ params: { channelId: 'c' } })).rejects.toBeInstanceOf(
      UndeclaredStatusError,
    );
  });

  it('checks a body against the route when asked to', async () => {
    const client = createClient(api, {
      baseUrl: 'https://api.test',
      fetch: answering(200, '{"items":[3]}').fetch,
      validateResponses: true,
    });

    await expect(client.listDates({ params: { channelId: 'c' } })).rejects.toThrow();
  });

  it('types and passes a derived error the route does not declare', async () => {
    const client = createClient(api, {
      baseUrl: 'https://api.test',
      fetch: answering(429, '{"error":{"code":"api.rate_limited"}}').fetch,
    });

    const response = await client.listDates({ params: { channelId: 'c' } });

    expect(response.status).toBe(429);
  });

  it('narrows a refusal on error.code, its params typed, from the codes the route lists', async () => {
    const quoteId = { name: 'quoteId', in: 'path', required: true, schema: z.string() } as const;
    const confirmQuote = studioV1
      .identity(operator)
      .errors([OrderErrorCode.SOLD_OUT])
      .resource('quotes', { id: quoteId })
      .action('confirm', { errors: [OrderErrorCode.PRICE_STALE, DomainErrorCode.STATE_CONFLICT] });
    const quotes = defineApi({
      openapi: '3.1.1',
      info: { title: 'test', version: '1' },
      routes: { confirmQuote },
      components: {},
    });
    const stale = {
      error: {
        code: OrderErrorCode.PRICE_STALE,
        nature: 'refused',
        params: { expectedAmountMinor: 2400, currentAmountMinor: 2900, currencyCode: 'EUR' },
        traceId: 't',
      },
      servedAt: '2026-10-05T10:00:00Z',
    };
    const client = createClient(quotes, {
      baseUrl: 'https://api.test',
      fetch: answering(409, JSON.stringify(stale)).fetch,
    });

    const response = await client.confirmQuote({ params: { quoteId: 'q' } });

    expectTypeOf(confirmQuote.errorCodes[409]).toEqualTypeOf<
      readonly (
        | typeof OrderErrorCode.SOLD_OUT
        | typeof OrderErrorCode.PRICE_STALE
        | typeof DomainErrorCode.STATE_CONFLICT
        | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
        | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT
      )[]
    >();
    expect(response.status).toBe(409);
    if (response.status !== 409) return;
    const { error } = response.body;
    if (error.code !== OrderErrorCode.PRICE_STALE) throw new Error(error.code);
    expectTypeOf(error.params).toEqualTypeOf<ErrorParamsRead<typeof OrderErrorCode.PRICE_STALE>>();
    expect(error.params.currentAmountMinor).toBe(2900);
  });
});
