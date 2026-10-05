import {
  SearchFiltersParameter,
  SearchQueryParameter,
  SearchResultsSchema,
  SearchSortParameter,
  SearchTabParameter,
} from './schemas.js';
import type { SearchRoute } from './types.js';
import { ShowGroupSchema } from '../../catalog/index.js';
import { Freshness, cursor } from '../../http/index.js';
import {
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  publicRead,
  storefrontV1,
  viewer,
} from '../components.js';

export const search: SearchRoute = storefrontV1
  .identity(viewer)
  .optionalAuth()
  .headers(SurfaceParameter, TraceparentParameter)
  .tags(StorefrontTag.DISCOVERY)
  .single('search')
  .findAll({
    operationId: 'search',
    summary: 'Full-text search, facets counted on the current query, grouping by show.',
    paging: cursor({ maxLimit: 50 }),
    parameters: [
      SearchQueryParameter,
      SearchTabParameter,
      SearchSortParameter,
      SearchFiltersParameter,
    ],
    cache: publicRead(Freshness.MINUTE),
    item: ShowGroupSchema,
    responses: {
      200: {
        description: 'Results, facets and structured filters.',
        content: { 'application/json': { schema: SearchResultsSchema } },
      },
    },
  });
