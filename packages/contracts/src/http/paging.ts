/**
 * How a list is paged, declared as data: the server reads the kind and its ceiling from the route,
 * and the api's conventions say which parameters and which page envelope each kind has. A surface
 * has a default (cursor on the storefront, pages on the studio), and a list overrides it.
 */

import { z } from 'zod';

import type { Parameter } from './index.js';

export type Paging =
  | { readonly kind: 'cursor'; readonly maxLimit: number }
  | { readonly kind: 'pages'; readonly maxPageSize: number }
  | { readonly kind: 'changesSince' };

export type PagingKind = Paging['kind'];

/** `cursor` and `limit`: `400 api.schema_invalid` on a malformed cursor, `410 api.cursor_too_old` on an old one. */
export function cursor(options: { readonly maxLimit: number }): {
  readonly kind: 'cursor';
  readonly maxLimit: number;
} {
  return { kind: 'cursor', maxLimit: options.maxLimit };
}

/** `page` and `pageSize`: the studio's page with its total. */
export function pages(options: { readonly maxPageSize: number }): {
  readonly kind: 'pages';
  readonly maxPageSize: number;
} {
  return { kind: 'pages', maxPageSize: options.maxPageSize };
}

/** The token a change feed takes: `410` when it is too old. */
export function changesSince(): { readonly kind: 'changesSince' } {
  return { kind: 'changesSince' };
}

/** What an api says about a kind of paging: its parameters, and the envelope of one page of `data`. */
export interface PagingConvention<K extends Paging = Paging> {
  readonly parameters: (paging: K) => readonly Parameter[];
  readonly page: (data: z.ZodType) => z.ZodType;
}

export interface PagingConventions {
  readonly cursor?: PagingConvention<Extract<Paging, { kind: 'cursor' }>>;
  readonly pages?: PagingConvention<Extract<Paging, { kind: 'pages' }>>;
}

/** A sort key, and the right a caller needs to order by it when the field is restricted. */
export type SortKey = string | { readonly key: string; readonly right: string };

export function sortKeyName(key: SortKey): string {
  return typeof key === 'string' ? key : key.key;
}

/** The directions a list can be ordered in. */
const SORT_DIRECTIONS = ['asc', 'desc'] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

/** The `sortDir` schema: ascending unless asked otherwise. */
export function sortDirectionSchema(): z.ZodDefault<
  z.ZodEnum<{ readonly [K in SortDirection]: K }>
> {
  return z.enum(SORT_DIRECTIONS).default(SORT_DIRECTIONS[0]);
}
