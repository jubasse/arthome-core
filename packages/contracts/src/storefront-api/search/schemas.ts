import { z } from 'zod';

import type { VocabularyIn } from '@arthome/core/schema';

import {
  ArtistSummarySchema,
  FacetSchema,
  SearchCriteriaSchema,
  ShowGroupSchema,
  StructuredFilterSchema,
} from '../../catalog/index.js';
import { StorefrontEnvelopeMetaSchema } from '../../envelope/index.js';
import type { QueryParameter } from '../../http/index.js';
import { localVocabulary, searchText } from '../../http/index.js';
import { StorefrontCursorPageInfoSchema } from '../../pagination/index.js';

const SORT_OR_FILTER_KEY =
  "A sort or filter key. It is a property of THIS endpoint's list — which orders it offers — not of the domain, and adding one is an endpoint change rather than a vocabulary change.";
const SEARCH_TABS = ['best', 'lives', 'replays', 'artists'] as const;
const SEARCH_SORTS = ['relevance', 'soon', 'popularity', 'price_asc', 'price_desc'] as const;

export const SearchQueryParameter: QueryParameter<'q', z.ZodString> = searchText({ minLength: 2 });

export const SearchTabParameter: QueryParameter<
  'tab',
  z.ZodDefault<VocabularyIn<typeof SEARCH_TABS>>
> = {
  name: 'tab',
  in: 'query',
  schema: localVocabulary(SEARCH_TABS, SORT_OR_FILTER_KEY).default('best'),
};

export const SearchSortParameter: QueryParameter<
  'sort',
  z.ZodDefault<VocabularyIn<typeof SEARCH_SORTS>>
> = {
  name: 'sort',
  in: 'query',
  description:
    '**Five sorts**, not four: `price_desc` exists in the design, exactly like the other four.',
  schema: localVocabulary(SEARCH_SORTS, SORT_OR_FILTER_KEY).default('relevance'),
};

export const SearchFiltersParameter: QueryParameter<'filters', typeof SearchCriteriaSchema> = {
  name: 'filters',
  in: 'query',
  description:
    'Criteria, in the grammar **published** opposite. This parameter used to be a free string: on\nthe most important parameter of the most used screen, that meant zod validated nothing and\nthree surfaces would serialise it three ways — when a normalised shape **already exists**,\nsince `normalizeSearchCriteria()` produces its signature in `@arthome/core`. That is the\nshape published here, and it is the same one as `SavedSearch.criteria`.\n',
  schema: SearchCriteriaSchema,
};

export const SearchResultsSchema: z.ZodIntersection<
  typeof StorefrontEnvelopeMetaSchema,
  z.ZodObject<
    {
      groups: z.ZodOptional<z.ZodArray<typeof ShowGroupSchema>>;
      artists: z.ZodOptional<z.ZodArray<typeof ArtistSummarySchema>>;
      facets: z.ZodArray<typeof FacetSchema>;
      structuredFilters: z.ZodOptional<z.ZodArray<typeof StructuredFilterSchema>>;
      page: typeof StorefrontCursorPageInfoSchema;
    },
    z.core.$loose
  >
> = z.intersection(
  StorefrontEnvelopeMetaSchema,
  z.looseObject({
    groups: z.array(ShowGroupSchema).optional(),
    artists: z.array(ArtistSummarySchema).optional(),
    facets: z.array(FacetSchema),
    structuredFilters: z.array(StructuredFilterSchema).optional(),
    page: StorefrontCursorPageInfoSchema,
  }),
);

export type SearchResults = z.output<typeof SearchResultsSchema>;
