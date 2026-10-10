import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { openApiDocumentOf } from './index.js';
import { defineApi, defineRoute, tagged, type Parameter, type Response } from '../http/index.js';
import { streamingServiceDocs } from '../streaming-service-api/docs.js';
import { streamingServiceApi } from '../streaming-service-api/index.js';

const Money = z.looseObject({ amountMinor: z.int(), currencyCode: z.string() });

const Surface: Parameter = {
  name: 'X-Arthome-Surface',
  in: 'header',
  required: true,
  schema: z.string(),
};

const Refused: Response = { description: 'Refused.' };

const quote = defineRoute({
  method: 'post',
  version: 1,
  path: '/quotes',
  operationId: 'createQuote',
  'x-arthome-invalidates': ['quotes'],
  parameters: [Surface, { name: 'dry', in: 'query', schema: z.boolean().default(false) }],
  requestBody: {
    required: true,
    content: { 'application/json': { schema: z.object({ seats: z.int().default(1) }) } },
  },
  responses: {
    200: {
      description: 'The quote.',
      content: {
        'application/json': {
          schema: z.looseObject({ total: Money, lines: z.array(Money) }),
        },
      },
    },
    400: Refused,
  },
});

const getQuote = defineRoute({
  method: 'get',
  version: 1,
  path: '/quotes',
  operationId: 'getQuote',
  responses: { 200: { description: 'The last quote.' } },
});

const api = defineApi({
  openapi: '3.1.1',
  info: { title: 'test', version: '1' },
  routes: { createQuote: quote, getQuote },
  components: {
    parameters: { Surface },
    responses: { Refused },
    schemas: { Money },
  },
});

const document = openApiDocumentOf(api) as {
  paths: Record<string, Record<string, Record<string, unknown>>>;
  components: Record<string, Record<string, unknown>>;
};
const operation: Record<string, unknown> = document.paths['/v1/quotes']?.post ?? {};

describe('openApiDocumentOf', () => {
  it('writes a component a route reuses as a `$ref`, and an inline one in place', () => {
    expect(operation.parameters).toEqual([
      { $ref: '#/components/parameters/Surface' },
      { name: 'dry', in: 'query', schema: { type: 'boolean', default: false } },
    ]);
    expect((operation.responses as Record<string, unknown>)['400']).toEqual({
      $ref: '#/components/responses/Refused',
    });
  });

  it('refers to a component schema from inside a route’s own schema', () => {
    expect(operation.responses).toMatchObject({
      200: {
        content: {
          'application/json': {
            schema: {
              properties: {
                total: { $ref: '#/components/schemas/Money' },
                lines: { items: { $ref: '#/components/schemas/Money' } },
              },
            },
          },
        },
      },
    });
  });

  it('emits a request as its input and a response as its output', () => {
    const body = (
      operation.requestBody as { content: Record<string, { schema: Record<string, unknown> }> }
    ).content['application/json']?.schema;

    expect(body).toMatchObject({ type: 'object', properties: { seats: { default: 1 } } });
    expect(body).not.toHaveProperty('required');
    expect(body).not.toHaveProperty('additionalProperties');
    expect(document.components.schemas?.Money).toMatchObject({
      required: ['amountMinor', 'currencyCode'],
    });
  });

  it('keeps the operation’s extensions, and groups two methods under one path', () => {
    expect(operation['x-arthome-invalidates']).toEqual(['quotes']);
    expect(Object.keys(document.paths['/v1/quotes'] ?? {})).toEqual(['post', 'get']);
  });
});

describe('tagged unions', () => {
  const Succeeded = tagged('outcome', {
    succeeded: z.object({ receipt: z.string() }),
    declined: z.object({ declineCode: z.string() }),
  });
  const pay = defineRoute({
    method: 'post',
    version: 1,
    path: '/pay',
    operationId: 'pay',
    responses: {
      200: { description: 'Paid.', content: { 'application/json': { schema: Succeeded } } },
    },
  });

  it('writes the discriminator, and maps each tag to the component that fixes it when the variants are named', () => {
    const [first, second] = (Succeeded as unknown as { def: { options: z.ZodType[] } }).def.options;
    const document = openApiDocumentOf(
      defineApi({
        openapi: '3.1.0',
        info: { title: 'x', version: '1' },
        routes: { pay },
        components: {
          schemas: {
            Outcome: Succeeded,
            PaymentSucceeded: first!,
            PaymentDeclined: second!,
          },
        },
      }),
    ) as { components: { schemas: { Outcome: { discriminator: unknown } } } };

    expect(document.components.schemas.Outcome.discriminator).toEqual({
      propertyName: 'outcome',
      mapping: {
        succeeded: '#/components/schemas/PaymentSucceeded',
        declined: '#/components/schemas/PaymentDeclined',
      },
    });
  });
});

describe('a service document', () => {
  it('marks every operation internal', () => {
    const { paths } = openApiDocumentOf(streamingServiceApi, streamingServiceDocs) as {
      readonly paths: Readonly<Record<string, Readonly<Record<string, Record<string, unknown>>>>>;
    };
    const operations = Object.values(paths).flatMap((methods) => Object.values(methods));

    expect(operations).toHaveLength(Object.keys(streamingServiceApi.routes).length);
    expect(operations.filter((operation) => operation['x-arthome-internal'] !== true)).toEqual([]);
  });
});
