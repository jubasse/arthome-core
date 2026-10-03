import { z } from 'zod';
import type { VocabularyIn } from '@arthome/core/schema';
import { BadRequestResponse, CursorParameter, GoneResponse, LimitParameter, SurfaceParameter, TraceparentParameter } from './components.js';
import { ArtistSummarySchema, FacetSchema, SearchCriteriaSchema, ShowGroupSchema, StructuredFilterSchema } from '../catalog/index.js';
import { StorefrontEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonResponse, QueryParameter, Route } from '../http/index.js';
import { StorefrontCursorPageInfoSchema } from '../pagination/index.js';
declare const SEARCH_TAB: readonly ["best", "lives", "replays", "artists"];
declare const SEARCH_SORT: readonly ["relevance", "soon", "popularity", "price_asc", "price_desc"];
export declare const search: Route<{
    method: 'get';
    path: '/v1/search';
    parameters: readonly [
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof CursorParameter,
        typeof LimitParameter,
        QueryParameter<'q', z.ZodString>,
        QueryParameter<'tab', z.ZodDefault<VocabularyIn<typeof SEARCH_TAB>>>,
        QueryParameter<'sort', z.ZodDefault<VocabularyIn<typeof SEARCH_SORT>>>,
        QueryParameter<'filters', typeof SearchCriteriaSchema>
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            groups: z.ZodOptional<z.ZodArray<typeof ShowGroupSchema>>;
            artists: z.ZodOptional<z.ZodArray<typeof ArtistSummarySchema>>;
            facets: z.ZodArray<typeof FacetSchema>;
            structuredFilters: z.ZodOptional<z.ZodArray<typeof StructuredFilterSchema>>;
            page: typeof StorefrontCursorPageInfoSchema;
        }, z.core.$loose>>>;
        400: typeof BadRequestResponse;
        410: typeof GoneResponse;
    };
}>;
export {};
//# sourceMappingURL=discovery.d.ts.map