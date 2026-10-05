import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import type { ApiErrorCode } from '@arthome/core';
import { CatalogErrorCode } from '@arthome/core';

import { collect } from './collect.js';
import type { ErrorBody } from './errors.js';
import {
  Freshness,
  cache,
  changesSince,
  cursor,
  defineApi,
  pages,
  successStatusOf,
  versionedPath,
} from './index.js';
import { createClient } from '../http-client/index.js';
import { storefrontConventions, storefrontV1 } from '../storefront-api/components.js';
import { studioV1 } from '../studio-api/components.js';

const savedSearchId = {
  name: 'savedSearchId',
  in: 'path',
  required: true,
  schema: z.string(),
} as const;
const channelId = { name: 'channelId', in: 'path', required: true, schema: z.string() } as const;
const SavedSearch = z.looseObject({ name: z.string(), query: z.string() });
const Versioned = z.looseObject({ name: z.string(), version: z.number() });
const Writable = z.looseObject({ name: z.string(), query: z.string().nullable().optional() });

const searches = storefrontV1
  .public()
  .tags('searches')
  .resource('saved-searches', { id: savedSearchId });
const members = searches.crud({
  item: SavedSearch,
  create: { body: Writable },
  update: { fields: Writable },
});

describe('resource members', () => {
  it('derive their operation ids and paths from the resource name', () => {
    expect(members.findSavedSearch.operationId).toBe('findSavedSearch');
    expect(members.findAllSavedSearches.operationId).toBe('findAllSavedSearches');
    expect(members.createSavedSearch.operationId).toBe('createSavedSearch');
    expect(members.updateSavedSearch.operationId).toBe('updateSavedSearch');
    expect(members.deleteSavedSearch.operationId).toBe('deleteSavedSearch');
    expect(members.findSavedSearch.path).toBe('/saved-searches/{savedSearchId}');
    expect(members.findAllSavedSearches.path).toBe('/saved-searches');
  });

  it('gives crud find, findAll, create, update and delete, and neither replace nor upsert', () => {
    expect(Object.keys(members).sort()).toEqual([
      'createSavedSearch',
      'deleteSavedSearch',
      'findAllSavedSearches',
      'findSavedSearch',
      'updateSavedSearch',
    ]);
    expectTypeOf(members).not.toHaveProperty('replaceSavedSearch');
  });

  it('keys a member by the operation id its options give', () => {
    const named = searches.crud({
      item: SavedSearch,
      pick: ['findAll', 'delete'],
      findAll: { operationId: 'listSavedSearches' },
    });

    expect(Object.keys(named)).toEqual(['listSavedSearches', 'deleteSavedSearch']);
    expectTypeOf(named).toHaveProperty('listSavedSearches');
  });

  it('opens replace and upsert when asked for', () => {
    const more = searches.crud({
      item: SavedSearch,
      create: { body: Writable },
      update: { fields: Writable },
      replace: { body: Writable },
      upsert: {},
    });

    expect(more.replaceSavedSearch.method).toBe('put');
    expect(more.upsertSavedSearch.method).toBe('put');
  });

  it('takes omit or pick, never both', () => {
    const only = searches.crud({ item: SavedSearch, pick: ['find', 'findAll'] });
    const both = () =>
      // @ts-expect-error pick and omit exclude each other
      searches.crud({ item: SavedSearch, pick: ['find'], omit: ['delete'] });
    const unconfigured = () =>
      // @ts-expect-error create is selected and has no options
      searches.crud({ item: SavedSearch, update: { fields: Writable } });

    expect(Object.keys(only)).toEqual(['findSavedSearch', 'findAllSavedSearches']);
    expect(both).toThrow(/not both/);
    expect(unconfigured).toThrow(/no "create" options/);
  });

  it('declares the convention errors per status, 404 and 409 on a write of one record', () => {
    expect(Object.keys(members.updateSavedSearch.responses)).toEqual(
      expect.arrayContaining(['200', '404', '409']),
    );
    expect(Object.keys(members.findSavedSearch.responses)).toEqual(
      expect.arrayContaining(['200', '404']),
    );
    expect(successStatusOf(members.createSavedSearch)).toBe(201);
  });

  it('reads a patch as the writable fields made optional, with expectedVersion', () => {
    const body = members.updateSavedSearch.requestBody.content['application/json'].schema;

    expect(body.safeParse({ expectedVersion: 3 }).success).toBe(true);
    expect(body.safeParse({ name: 'x' }).success).toBe(false);
    expectTypeOf<z.output<typeof body>>().toMatchTypeOf<{ expectedVersion: number }>();
  });

  it('adds a domain code to a status and types the client union on it', () => {
    const things = studioV1.public().resource('things', { id: savedSearchId });
    const publish = things.action('publish', {
      errors: [CatalogErrorCode.PRICES_LOCKED],
    });
    type Conflict = z.output<
      (typeof publish.responses)[409]['content']['application/json']['schema']
    >;

    expect(publish.path).toBe('/things/{savedSearchId}/publish');
    expect(publish.operationId).toBe('publishThing');
    expectTypeOf<Conflict>().toEqualTypeOf<
      ErrorBody<
        | typeof CatalogErrorCode.PRICES_LOCKED
        | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
        | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT
      >
    >();
  });

  it('refuses at compile time a code the storefront does not relay', () => {
    searches.action('refuse', {
      // @ts-expect-error a surface cannot be handed this code
      errors: [CatalogErrorCode.PRICES_LOCKED],
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

  it('carries the request example and an optional body, and drops its own success for a stated one', () => {
    const route = searches.action('archive', {
      body: Writable,
      optionalBody: true,
      example: { name: 'x' },
      responses: { 202: { description: 'Accepted.' } },
    });

    expect(route.requestBody.required).toBe(false);
    expect(route.requestBody.content['application/json'].example).toEqual({ name: 'x' });
    expect(Object.keys(route.responses)).toContain('202');
    expect(Object.keys(route.responses)).not.toContain('204');
  });

  it('lets a builder that already holds the idempotency key place it', () => {
    const key = storefrontConventions.writeParameters[0];
    const held = storefrontV1.public().headers(key).resource('things', { id: savedSearchId });

    const names = held.action('freeze', {}).parameters.map((parameter) => parameter.name);

    expect(names.filter((name) => name === key.name)).toHaveLength(1);
  });
});

describe('owner: caller', () => {
  const mine = storefrontV1.public().resource('devices', { id: savedSearchId, owner: 'caller' });

  it('carries no version, no state conflict, and says whose data it is', () => {
    const update = mine.update({ item: Versioned, fields: Writable });
    const remove = mine.delete({ response: Versioned });

    expect(update.owner).toBe('caller');
    expect(
      update.requestBody.content['application/json'].schema.safeParse({ name: 'x' }).success,
    ).toBe(true);
    expect(remove.parameters.map((parameter) => parameter.name)).not.toContain('expectedVersion');
    expect(Object.keys(remove.responses)).toContain('200');
    expect(Object.keys(update.responses)).toContain('409');
  });

  it('refuses at compile time an item with no version on a shared resource', () => {
    // @ts-expect-error a versioned write needs `version` in the item
    searches.update({ item: SavedSearch, fields: Writable });
    mine.update({ item: SavedSearch, fields: Writable });
  });

  it('has a 204 delete unless a response is given', () => {
    expect(successStatusOf(mine.delete())).toBe(204);
  });
});

describe('single', () => {
  const preferences = storefrontV1.public().single('me/preferences', { owner: 'caller' });

  it('has no id in its URL, and no 404 to find', () => {
    const find = preferences.find({ item: SavedSearch });
    const update = preferences.update({ item: SavedSearch, fields: Writable });

    expect(find.path).toBe('/me/preferences');
    expect(update.path).toBe('/me/preferences');
    expect(find.operationId).toBe('findPreferences');
    expect(Object.keys(find.responses)).not.toContain('404');
  });

  it('defaults crud to find and update', () => {
    const block = preferences.crud({ item: SavedSearch, update: { fields: Writable } });

    expect(Object.keys(block)).toEqual(['findPreferences', 'updatePreferences']);
  });

  it('answers an action on /{name}/{action}', () => {
    expect(preferences.action('reset', {}).path).toBe('/me/preferences/reset');
  });
});

describe('path', () => {
  const channel = studioV1.public().path('channels/{channelId}', channelId);

  it('puts its prefix and its path parameters on every route below it', () => {
    const members = channel.resource('members', { id: savedSearchId });
    const route = members.find({ item: SavedSearch });

    expect(route.path).toBe('/channels/{channelId}/members/{savedSearchId}');
    expect(route.parameters.slice(0, 2).map((parameter) => parameter.name)).toEqual([
      'channelId',
      'savedSearchId',
    ]);
    expect(versionedPath(route)).toBe('/v1/channels/{channelId}/members/{savedSearchId}');
  });

  it('refuses a placeholder with no parameter, at compile time and at run time', () => {
    // @ts-expect-error `{channelId}` has no parameter
    const unchecked = () => studioV1.path('channels/{channelId}');

    expect(unchecked).toThrow(/no parameter for channelId/);
  });

  it('nests as deep as the URL does, in closures that return their routes', () => {
    const tree = studioV1.public().resource('channels', { id: channelId }, (c) => ({
      settings: c.single('settings', undefined, (s) => ({
        updateChannelSettings: s.update({
          operationId: 'updateChannelSettings',
          item: Versioned,
          fields: Writable,
        }),
      })),
      moderation: c.path('moderation').resource('banned-words', { id: savedSearchId }, (word) => ({
        removeBannedWord: word.delete({ operationId: 'removeBannedWord' }),
      })),
    }));

    const listed = collect(tree);

    expect(listed.updateChannelSettings.path).toBe('/channels/{channelId}/settings');
    expect(listed.removeBannedWord.path).toBe(
      '/channels/{channelId}/moderation/banned-words/{savedSearchId}',
    );
    expect(Object.keys(listed)).toEqual(['updateChannelSettings', 'removeBannedWord']);
  });

  it('refuses a key that is not the operation id, and a duplicate', () => {
    const route = searches.find({ item: SavedSearch });

    expect(() => collect({ wrong: route })).toThrow(/operation "findSavedSearch"/);
    expect(() => collect({ findSavedSearch: route }, { findSavedSearch: route })).toThrow(/twice/);
  });
});

describe('batch', () => {
  it('reads many by id in one POST, with the batch ceiling and no idempotency key', () => {
    const route = searches.batch({ item: SavedSearch });

    expect(route.path).toBe('/saved-searches/batch');
    expect(route.operationId).toBe('batchSavedSearches');
    expect(route.bodyLimit).toBe(2_097_152);
    expect(route.parameters).toEqual([]);
    expect(
      route.requestBody.content['application/json'].schema.safeParse({ ids: ['a'] }).success,
    ).toBe(true);
  });
});

describe('reads', () => {
  const dates = studioV1.public().resource('dates', { id: savedSearchId });
  const Date = z.looseObject({ title: z.string() });

  it('pages a list the way the api serves it, and says so on the route', () => {
    const list = dates.findAll({ item: Date });
    const queue = dates.findAll({
      item: Date,
      operationId: 'listQueue',
      paging: cursor({ maxLimit: 30 }),
    });

    expect(list.paging).toEqual({ kind: 'pages', maxPageSize: 100 });
    expect(queue.paging).toEqual({ kind: 'cursor', maxLimit: 30 });
    expect(queue.parameters.map((parameter) => parameter.name)).toEqual(['cursor', 'limit']);
    expect(Object.keys(queue.responses)).toContain('410');
  });

  it('refuses a kind of paging the api does not serve', () => {
    expect(() => searches.findAll({ item: Date, paging: pages({ maxPageSize: 10 }) })).toThrow(
      /no "pages" paging/,
    );
  });

  it('reads a change feed from a token', () => {
    const feed = searches.findAll({
      item: Date,
      operationId: 'listChanges',
      paging: changesSince(),
    });

    expect(feed.parameters.map((parameter) => parameter.name)).toEqual(['since']);
    expect(Object.keys(feed.responses)).toContain('410');
  });

  it('types the sort keys, refuses a restricted one with its code, and takes filters', () => {
    const list = dates.findAll({
      item: Date,
      sortable: ['startsAt', { key: 'revenue', right: 'canRevenue' }],
      filters: z.object({ q: z.string().optional() }),
    });
    const sortBy = list.parameters.find((parameter) => parameter.name === 'sortBy');

    expect(sortBy?.schema.safeParse('revenue').success).toBe(true);
    expect(sortBy?.schema.safeParse('other').success).toBe(false);
    expect(list.sortable).toEqual(['startsAt', { key: 'revenue', right: 'canRevenue' }]);
    expect(list.parameters.map((parameter) => parameter.name)).toEqual(
      expect.arrayContaining(['sortBy', 'sortDir', 'filters']),
    );
    expect(Object.keys(list.responses)).toContain('403');
    expectTypeOf(list.parameters[2]).toHaveProperty('name');
  });

  it('returns a relation only on demand, marked in the document', () => {
    const Author = z.looseObject({ name: z.string() });
    const find = dates.find({ item: Date, expand: { author: Author } });
    const include = find.parameters.find((parameter) => parameter.name === 'include');
    const body = find.responses[200].content['application/json'].schema;

    expect(include?.schema.safeParse(['author']).success).toBe(true);
    expect(include?.schema.safeParse(['other']).success).toBe(false);
    expect(body.safeParse({ servedAt: 'x', rightsVersion: 1, data: { title: 't' } }).success).toBe(
      true,
    );
    expect(JSON.stringify(z.toJSONSchema(body, { io: 'output' }))).toContain(
      'x-arthome-expanded-by',
    );
    expect(Object.keys(find.expand ?? {})).toEqual(['author']);
  });

  it('adds the ETag only when the read caches with one', () => {
    const plain = dates.find({ item: Date });
    const cached = dates.find({
      item: Date,
      operationId: 'findCachedDate',
      cache: cache(Freshness.MINUTE, { etag: true }),
    });

    expect(Object.keys(plain.responses)).not.toContain('304');
    expect(Object.keys(cached.responses)).toContain('304');
    expect(cached.parameters.map((parameter) => parameter.name)).toContain('If-None-Match');
  });
});

describe('the client of a read with relations', () => {
  const Author = z.looseObject({ name: z.string() });
  const Book = z.looseObject({ title: z.string() });
  const books = studioV1.public().resource('books', { id: savedSearchId });
  const find = books.find({ item: Book, expand: { author: Author } });
  const api = defineApi({
    openapi: '3.1.0',
    info: { title: 'x', version: '1' },
    routes: { findBook: find },
    components: {},
  });
  const client = createClient(api, {
    baseUrl: 'http://x',
    fetch: () =>
      Promise.resolve({
        status: 200,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve('{"data":{"title":"t"}}'),
      }),
  });

  it('has a relation in the type only when it was asked for', async () => {
    const without = await client.findBook({ params: { savedSearchId: 'a' } });
    const asked = await client.findBook({
      params: { savedSearchId: 'a' },
      query: { include: ['author'] },
    });

    if (without.status === 200) {
      expectTypeOf(without.body.data.author).toEqualTypeOf<
        { [x: string]: unknown; name: string } | undefined
      >();
    }
    if (asked.status === 200) {
      expectTypeOf(asked.body.data.author).toEqualTypeOf<{ [x: string]: unknown; name: string }>();
    }
    expect(find.expand).toHaveProperty('author');
  });
});
