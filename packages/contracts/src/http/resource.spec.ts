import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import type { ApiErrorCode } from '@arthome/core';
import { CatalogErrorCode } from '@arthome/core';

import type { ErrorBody } from './errors.js';
import { successStatusOf } from './index.js';
import { storefrontV1 } from '../storefront-api/components.js';
import { studioV1 } from '../studio-api/components.js';

const savedSearchId = {
  name: 'savedSearchId',
  in: 'path',
  required: true,
  schema: z.string(),
} as const;
const SavedSearch = z.looseObject({ name: z.string(), query: z.string() });
const Writable = z.looseObject({ name: z.string(), query: z.string().nullable().optional() });

const searches = storefrontV1.tags('searches').resource('saved-searches', { id: savedSearchId });
const members = searches.crud({
  item: SavedSearch,
  create: { body: Writable },
  update: { fields: Writable },
});

describe('resource members', () => {
  it('derive their operation ids and paths from the resource name', () => {
    expect(members.find.operationId).toBe('findSavedSearch');
    expect(members.findAll.operationId).toBe('findAllSavedSearches');
    expect(members.create.operationId).toBe('createSavedSearch');
    expect(members.update.operationId).toBe('updateSavedSearch');
    expect(members.delete.operationId).toBe('deleteSavedSearch');
    expect(members.find.path).toBe('/saved-searches/{savedSearchId}');
    expect(members.findAll.path).toBe('/saved-searches');
  });

  it('gives crud find, findAll, create, update and delete, and neither replace nor upsert', () => {
    expect(Object.keys(members).sort()).toEqual(['create', 'delete', 'find', 'findAll', 'update']);
    expectTypeOf(members).not.toHaveProperty('replace');
    expectTypeOf(members).not.toHaveProperty('upsert');
  });

  it('opens replace and upsert when asked for', () => {
    const more = searches.crud({
      item: SavedSearch,
      create: { body: Writable },
      update: { fields: Writable },
      replace: { body: Writable },
      upsert: {},
    });

    expect(more.replace.method).toBe('put');
    expect(more.upsert.method).toBe('put');
    expect(more.replace.operationId).toBe('replaceSavedSearch');
  });

  it('takes omit or pick, never both', () => {
    const only = searches.crud({ item: SavedSearch, pick: ['find', 'findAll'] });
    const without = searches.crud({
      item: SavedSearch,
      create: { body: Writable },
      update: { fields: Writable },
      omit: ['delete'],
    });

    expect(Object.keys(only)).toEqual(['find', 'findAll']);
    expect(Object.keys(without)).not.toContain('delete');
    const both = () =>
      // @ts-expect-error pick and omit exclude each other
      searches.crud({ item: SavedSearch, pick: ['find'], omit: ['delete'] });
    const unconfigured = () =>
      // @ts-expect-error create is selected and has no options
      searches.crud({ item: SavedSearch, update: { fields: Writable } });
    expect(both).toThrow(/not both/);
    expect(unconfigured).toThrow(/no "create" options/);
  });

  it('declares the convention errors per status, 404 and 409 on a write of one record', () => {
    expect(Object.keys(members.update.responses).sort()).toEqual(
      expect.arrayContaining(['200', '404', '409']),
    );
    expect(Object.keys(members.find.responses)).toEqual(
      expect.arrayContaining(['200', '304', '404']),
    );
    expect(successStatusOf(members.create)).toBe(201);
  });

  it('reads a patch as the writable fields made optional, with expectedVersion', () => {
    const body = members.update.requestBody.content['application/json'].schema;

    expect(body.safeParse({ expectedVersion: 3 }).success).toBe(true);
    expect(body.safeParse({ name: 'x' }).success).toBe(false);
    expectTypeOf<z.output<typeof body>>().toMatchTypeOf<{ expectedVersion: number }>();
  });

  it('adds a domain code to a status and types the client union on it', () => {
    const things = studioV1.resource('things', { id: savedSearchId });
    const publish = things.action('publish', {
      errors: { 409: [CatalogErrorCode.PRICES_LOCKED] },
    });
    type Conflict = z.output<
      (typeof publish.responses)[409]['content']['application/json']['schema']
    >;

    expect(publish.path).toBe('/things/{savedSearchId}/publish');
    expect(publish.operationId).toBe('publishThing');
    expectTypeOf<Conflict>().toMatchTypeOf<
      ErrorBody<
        | typeof CatalogErrorCode.PRICES_LOCKED
        | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
        | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT
      >
    >();
  });

  it('refuses at compile time a code the storefront does not relay', () => {
    searches.action('refuse', {
      errors: {
        // @ts-expect-error a surface cannot be handed this code
        409: [CatalogErrorCode.PRICES_LOCKED],
      },
    });
  });

  it('exposes collection actions, sub-resources and upsert on their paths', () => {
    const route = searches.collectionAction('purge', {});
    const prices = searches.subresource('prices').replace({ body: Writable });

    expect(route.path).toBe('/saved-searches/purge');
    expect(route.operationId).toBe('purgeSavedSearches');
    expect(prices.path).toBe('/saved-searches/{savedSearchId}/prices');
    expect(prices.method).toBe('put');
    expect(searches.upsert({}).path).toBe('/saved-searches/{savedSearchId}');
  });
});
