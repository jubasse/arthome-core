/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */

import type { ApiErrorCode } from '@arthome/core';

import type { IdentifiedAccess, Route } from '../../http/index.js';
import type {
  CursorParameter,
  LimitParameter,
  SurfaceParameter,
  TraceparentParameter,
  viewer,
} from '../components.js';
import type {
  SearchFiltersParameter,
  SearchQueryParameter,
  SearchResultsSchema,
  SearchSortParameter,
  SearchTabParameter,
} from './schemas.js';

export type SearchRoute = Route<{
  method: 'get';
  version: 1;
  path: '/search';
  parameters: readonly [
    typeof CursorParameter,
    typeof LimitParameter,
    typeof SearchQueryParameter,
    typeof SearchTabParameter,
    typeof SearchSortParameter,
    typeof SearchFiltersParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof viewer, true>;
  responses: {
    200: {
      readonly description: 'Results, facets and structured filters.';
      readonly content: {
        readonly 'application/json': { readonly schema: typeof SearchResultsSchema };
      };
    };
  };
  errorCodes: {
    400: readonly (typeof ApiErrorCode.SCHEMA_INVALID)[];
  };
}>;
