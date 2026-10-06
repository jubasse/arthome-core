import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { Upstream } from '@arthome/core';

import type { ModuleDocs, ModuleExamples } from './docs.js';
import { ExampleRegistry, apiDocs, maturityOf } from './docs.js';
import { openApiDocumentOf } from './index.js';
import { defineApi, defineRoute } from '../http/index.js';
import { storefrontV1 } from '../storefront-api/components.js';
import { datesDocs } from '../studio-api/dates/docs.js';
import { getDateSheet } from '../studio-api/dates/routes.js';
import { studioDocsOf } from '../studio-api/docs.js';

type Operation = Record<string, unknown>;

describe('maturityOf', () => {
  it('is the regime of the owning service, the first one the operation calls', () => {
    expect(maturityOf([Upstream.CATALOG, Upstream.STREAMING])).toBe('stable');
    expect(maturityOf([Upstream.STREAMING, Upstream.CATALOG])).toBe('provisional');
  });

  it('derives nothing from what is not a service', () => {
    expect(maturityOf([Upstream.REALTIME])).toBeUndefined();
    expect(maturityOf([Upstream.REALTIME, Upstream.IDENTITY])).toBe('stable');
  });
});

describe('apiDocs', () => {
  it('refuses an operation documented by two modules', () => {
    const one: ModuleDocs = { getDate: { description: 'One.' } };

    expect(() => apiDocs({ modules: [one, one] })).toThrow('"getDate" is documented twice');
  });

  it('refuses a schema registered twice or with no example', () => {
    const Item = z.object({ name: z.string() });

    expect(
      () => new ExampleRegistry([[[Item, [{ name: 'a' }]]], [[Item, [{ name: 'b' }]]]]),
    ).toThrow('registered twice');
    expect(() => new ExampleRegistry([[[Item, []]]])).toThrow('with none');
  });

  it('lets a schema derived with .meta() inherit its parent’s examples', () => {
    const Item = z.object({ name: z.string() });
    const registry = new ExampleRegistry([[[Item, [{ name: 'a' }]]]]);

    expect(registry.firstOf(Item.meta({ description: 'An item.' }))).toEqual({ name: 'a' });
    expect(registry.firstOf(z.object({ name: z.string() }))).toBeUndefined();
  });

  it('hands another api the entries of the schemas it asks for, and refuses one with none', () => {
    const Item = z.object({ name: z.string() });
    const Other = z.object({ size: z.int() });
    const registry = new ExampleRegistry([[[Item, [{ name: 'a' }]], [Other, [{ size: 1 }]]]]);

    expect(registry.entriesOf([Item])).toEqual([[Item, [{ name: 'a' }]]]);
    expect(() => registry.entriesOf([z.object({})])).toThrow('has none');
  });
});

const Body = z.object({ name: z.string() });
const Item = z.looseObject({ id: z.string(), name: z.string() });

const createItem = defineRoute({
  method: 'post',
  version: 1,
  path: '/items',
  operationId: 'createItem',
  summary: 'Creates an item.',
  'x-arthome-invalidates': ['items'],
  requestBody: {
    required: true,
    content: { 'application/json': { schema: Body } },
  },
  responses: { 204: { description: 'Done.' } },
});

const getFeed = defineRoute({
  method: 'get',
  version: 1,
  path: '/feed',
  operationId: 'getFeed',
  responses: { 204: { description: 'Done.' } },
});

const inlineDocs = defineRoute({
  method: 'get',
  version: 1,
  path: '/inline',
  operationId: 'getInline',
  description: 'Inline prose.',
  'x-arthome-maturity': 'stable',
  responses: { 204: { description: 'Done.' } },
});

const items = storefrontV1.public().resource('items', {
  id: { name: 'itemId', in: 'path', required: true, schema: z.string() },
});
const { findItem } = items.crud({ item: Item, pick: ['find'] });

const api = defineApi({
  openapi: '3.1.1',
  security: [],
  routes: { createItem, getFeed, findItem },
  components: {},
});

const operationDocs = {
  createItem: { description: 'Registered prose.', upstream: [Upstream.CATALOG] },
  findItem: {
    description: 'One item.',
    upstream: [Upstream.CATALOG],
    maturity: 'provisional',
    maturityReason: 'not built',
  },
  getFeed: {
    description: 'A feed.',
    upstream: [Upstream.REALTIME],
    maturity: 'stable',
    maturityReason: 'realtime is not a service',
  },
} satisfies ModuleDocs;

const itemExamples = [
  [Body, [{ name: 'registered' }]],
  [Item, [{ id: 'itm_1', name: 'Registered' }]],
] as const satisfies ModuleExamples;

const docs = apiDocs({
  'x-arthome-codes-source': 'ERROR_CODES',
  info: { title: 'test', version: '1', description: 'The introduction.' },
  tags: [{ name: 'items', description: 'Items.' }],
  securitySchemes: { bearerToken: { type: 'http', scheme: 'bearer' } },
  modules: [operationDocs],
  examples: [itemExamples],
});

const document = openApiDocumentOf(api, docs) as {
  readonly paths: Record<string, Record<string, Operation>>;
  readonly components: Record<string, unknown>;
};
const created = document.paths['/v1/items']?.post ?? {};
const found = document.paths['/v1/items/{itemId}']?.get ?? {};

function exampleOf(operation: Operation, at: 'requestBody' | '200'): unknown {
  const holder =
    at === 'requestBody'
      ? (operation.requestBody as { content: Record<string, { example?: unknown }> })
      : (operation.responses as Record<string, { content: Record<string, { example?: unknown }> }>)[
          at
        ];
  return holder?.content['application/json']?.example;
}

describe('openApiDocumentOf with docs', () => {
  it('writes the document’s introduction from the docs, where the api would', () => {
    expect(Object.keys(document)).toEqual([
      'openapi',
      'x-arthome-codes-source',
      'info',
      'tags',
      'security',
      'paths',
      'components',
    ]);
    expect(document.components).toMatchObject({
      securitySchemes: { bearerToken: { type: 'http', scheme: 'bearer' } },
    });
  });

  it('prefers the registered prose and upstream, and derives the maturity from the upstream', () => {
    expect(created).toMatchObject({
      description: 'Registered prose.',
      'x-arthome-upstream': [Upstream.CATALOG],
      'x-arthome-maturity': 'stable',
    });
  });

  it('writes the identity and prose first, in one order, then the route’s other keys', () => {
    expect(Object.keys(created).slice(0, 6)).toEqual([
      'operationId',
      'summary',
      'description',
      'x-arthome-maturity',
      'x-arthome-upstream',
      'x-arthome-invalidates',
    ]);
  });

  it('writes a maturity stated because it differs from the owning service’s', () => {
    expect(found['x-arthome-maturity']).toBe('provisional');
  });

  it('writes the maturity stated for an operation that calls no service', () => {
    expect(document.paths['/v1/feed']?.get).toMatchObject({
      description: 'A feed.',
      'x-arthome-maturity': 'stable',
      'x-arthome-upstream': [Upstream.REALTIME],
    });
  });

  it('refuses a route that carries its own prose or doc-only x-arthome-*', () => {
    const carrying = defineApi({
      openapi: '3.1.1',
      security: [],
      routes: { getInline: inlineDocs },
      components: {},
    });

    expect(() => openApiDocumentOf(carrying, apiDocs({ info: { title: 'test', version: '1' } }))).toThrow(
      '"getInline" carries its own prose, x-arthome-maturity;',
    );
  });

  it('refuses a stated maturity the owning service already gives', () => {
    const redundant = apiDocs({
      info: { title: 'test', version: '1' },
      modules: [
        {
          createItem: {
            upstream: [Upstream.CHAT],
            maturity: 'provisional',
            maturityReason: 'none needed',
          },
        },
      ],
    });

    expect(() => openApiDocumentOf(api, redundant)).toThrow('leave it out');
  });

  it('takes a request’s example from the registry', () => {
    expect(exampleOf(created, 'requestBody')).toEqual({ name: 'registered' });
  });

  it('refuses an example a route writes itself', () => {
    const written = { schema: Body, example: { name: 'inline' } };
    const writing = defineRoute({
      method: 'post',
      version: 1,
      path: '/written',
      operationId: 'writeExample',
      requestBody: { required: true, content: { 'application/json': written } },
      responses: { 204: { description: 'Done.' } },
    });
    const carrying = defineApi({
      openapi: '3.1.1',
      security: [],
      routes: { writeExample: writing },
      components: {},
    });

    expect(() =>
      openApiDocumentOf(carrying, apiDocs({ info: { title: 'test', version: '1' } })),
    ).toThrow('"writeExample" writes its own example');
  });

  it('derives an answer’s example from its record’s, wrapped in the api’s envelope', () => {
    expect(exampleOf(found, '200')).toEqual({
      servedAt: '2026-09-21T19:00:00.000Z',
      data: { id: 'itm_1', name: 'Registered' },
    });
  });

  it('refuses docs for an operation the api does not serve', () => {
    const stray = apiDocs({ modules: [{ getNothing: { description: 'Nothing.' } }] });

    expect(() => openApiDocumentOf(api, stray)).toThrow('getNothing');
  });

  it('refuses a documented operation whose maturity nothing gives', () => {
    const silent = apiDocs({
      info: { title: 'test', version: '1' },
      modules: [{ getFeed: { description: 'A feed.', upstream: [Upstream.REALTIME] } }],
    });

    expect(() => openApiDocumentOf(api, silent)).toThrow('state its maturity');
  });

  it('needs an introduction from the api or its docs', () => {
    expect(() => openApiDocumentOf(api)).toThrow('no `info`');
  });
});

describe('studioDocsOf', () => {
  it('gives a route the docs its module registered, nothing to a route it does not serve', () => {
    expect(studioDocsOf(getDateSheet)).toEqual({
      description: datesDocs.getDateSheet?.description,
      'x-arthome-maturity': 'stable',
      'x-arthome-upstream': datesDocs.getDateSheet?.upstream,
    });
    expect(studioDocsOf(createItem)).toEqual({});
  });

  it('refuses a route that carries its own prose', () => {
    expect(() => studioDocsOf(inlineDocs)).toThrow('register it in its module');
  });
});
