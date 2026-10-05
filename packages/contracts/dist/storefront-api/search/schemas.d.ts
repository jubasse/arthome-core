import { z } from 'zod';
import type { VocabularyIn } from '@arthome/core/schema';
import { ArtistSummarySchema, FacetSchema, SearchCriteriaSchema, ShowGroupSchema, StructuredFilterSchema } from '../../catalog/index.js';
import { StorefrontEnvelopeMetaSchema } from '../../envelope/index.js';
import type { QueryParameter } from '../../http/index.js';
import { StorefrontCursorPageInfoSchema } from '../../pagination/index.js';
declare const SEARCH_TABS: readonly ["best", "lives", "replays", "artists"];
declare const SEARCH_SORTS: readonly ["relevance", "soon", "popularity", "price_asc", "price_desc"];
export declare const SearchQueryParameter: QueryParameter<'q', z.ZodString>;
export declare const SearchTabParameter: QueryParameter<'tab', z.ZodDefault<VocabularyIn<typeof SEARCH_TABS>>>;
export declare const SearchSortParameter: QueryParameter<'sort', z.ZodDefault<VocabularyIn<typeof SEARCH_SORTS>>>;
export declare const SearchFiltersParameter: QueryParameter<'filters', typeof SearchCriteriaSchema>;
export declare const SearchResultsSchema: z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
    groups: z.ZodOptional<z.ZodArray<typeof ShowGroupSchema>>;
    artists: z.ZodOptional<z.ZodArray<typeof ArtistSummarySchema>>;
    facets: z.ZodArray<typeof FacetSchema>;
    structuredFilters: z.ZodOptional<z.ZodArray<typeof StructuredFilterSchema>>;
    page: typeof StorefrontCursorPageInfoSchema;
}, z.core.$loose>>;
export type SearchResults = z.output<typeof SearchResultsSchema>;
export {};
//# sourceMappingURL=schemas.d.ts.map