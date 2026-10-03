import { z } from 'zod';
import type { VocabularyIn, VocabularyOut } from '@arthome/core/schema';
import { ArtistIdParameter, BadRequestResponse, CategoryIdParameter, CursorDirectionParameter, CursorParameter, GoneResponse, LimitParameter, NotFoundResponse, SurfaceParameter, TraceparentParameter, UnauthorizedResponse, UnavailableResponse, ViewerTimezoneParameter } from './components.js';
import { ArtistDetailSchema, ArtistSummarySchema, CategoryScreenSchema, CategoryTileSchema, DateCardSchema, FacetSchema, HomeScreenSchema, LiveScreenSchema, RailSchema, SearchCriteriaSchema, ShowGroupSchema, StructuredFilterSchema } from '../catalog/index.js';
import { StorefrontEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonResponse, PathParameter, QueryParameter, Route } from '../http/index.js';
import { StorefrontCursorPageInfoSchema } from '../pagination/index.js';
declare const GET_CATEGORY_SCREEN_SECTION: readonly ["overview", "live", "upcoming", "replays", "artists"];
declare const GET_CATEGORY_SCREEN_SORT: readonly ["relevance", "soon", "popularity", "price_asc", "price_desc"];
declare const LIST_ARTISTS_SORT: readonly ["alpha", "followers"];
declare const SEARCH_TAB: readonly ["best", "lives", "replays", "artists"];
declare const LIST_REPLAYS_SORT: readonly ["expiring_first", "recent", "popularity"];
declare const RESOLVE_PUBLIC_LINK_KIND: readonly ["date", "show", "artist", "category"];
export declare const getHomeScreen: Route<{
    method: 'get';
    path: '/v1/home';
    parameters: readonly [
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof ViewerTimezoneParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof HomeScreenSchema;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
        503: typeof UnavailableResponse;
    };
}>;
export declare const getLiveScreen: Route<{
    method: 'get';
    path: '/v1/live';
    parameters: readonly [
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof ViewerTimezoneParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof LiveScreenSchema;
        }, z.core.$loose>>>;
        503: typeof UnavailableResponse;
    };
}>;
export declare const listCategories: Route<{
    method: 'get';
    path: '/v1/categories';
    parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            items: z.ZodArray<typeof CategoryTileSchema>;
        }, z.core.$loose>>>;
        503: typeof UnavailableResponse;
    };
}>;
export declare const getCategoryScreen: Route<{
    method: 'get';
    path: '/v1/categories/{categoryId}';
    parameters: readonly [
        typeof CategoryIdParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        QueryParameter<'section', VocabularyIn<typeof GET_CATEGORY_SCREEN_SECTION>>,
        typeof CursorParameter,
        typeof LimitParameter,
        QueryParameter<'subGenreId', z.ZodString>,
        QueryParameter<'filters', typeof SearchCriteriaSchema>,
        QueryParameter<'sort', z.ZodDefault<VocabularyIn<typeof GET_CATEGORY_SCREEN_SORT>>>
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof CategoryScreenSchema;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
    };
}>;
export declare const listArtists: Route<{
    method: 'get';
    path: '/v1/artists';
    parameters: readonly [
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof CursorParameter,
        typeof CursorDirectionParameter,
        typeof LimitParameter,
        QueryParameter<'categoryId', z.ZodString>,
        QueryParameter<'sort', z.ZodDefault<VocabularyIn<typeof LIST_ARTISTS_SORT>>>,
        QueryParameter<'liveOnly', z.ZodDefault<z.ZodBoolean>>
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            items: z.ZodArray<typeof ArtistSummarySchema>;
            page: typeof StorefrontCursorPageInfoSchema;
        }, z.core.$loose>>>;
        410: typeof GoneResponse;
    };
}>;
export declare const getArtistDetail: Route<{
    method: 'get';
    path: '/v1/artists/{artistId}';
    parameters: readonly [
        typeof ArtistIdParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof ArtistDetailSchema;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
    };
}>;
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
        QueryParameter<'sort', z.ZodDefault<VocabularyIn<typeof GET_CATEGORY_SCREEN_SORT>>>,
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
export declare const listReplays: Route<{
    method: 'get';
    path: '/v1/replays';
    parameters: readonly [
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof CursorParameter,
        typeof LimitParameter,
        QueryParameter<'sort', z.ZodDefault<VocabularyIn<typeof LIST_REPLAYS_SORT>>>,
        QueryParameter<'categoryId', z.ZodString>
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            items: z.ZodArray<typeof DateCardSchema>;
            page: typeof StorefrontCursorPageInfoSchema;
        }, z.core.$loose>>>;
        410: typeof GoneResponse;
        503: typeof UnavailableResponse;
    };
}>;
export declare const extendRail: Route<{
    method: 'get';
    path: '/v1/rails/{railId}';
    parameters: readonly [
        PathParameter<'railId', z.ZodString>,
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof CursorParameter,
        typeof LimitParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof RailSchema;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
        410: typeof GoneResponse;
    };
}>;
export declare const resolvePublicLink: Route<{
    method: 'get';
    path: '/v1/resolve';
    parameters: readonly [
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        QueryParameter<'url', z.ZodString>,
        QueryParameter<'kind', VocabularyIn<typeof RESOLVE_PUBLIC_LINK_KIND>>,
        QueryParameter<'slug', z.ZodString>
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                kind: VocabularyOut;
                id: z.ZodString;
                canonicalUrl: z.ZodString;
                date: z.ZodOptional<typeof DateCardSchema>;
                artist: z.ZodOptional<typeof ArtistSummarySchema>;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        400: typeof BadRequestResponse;
        404: typeof NotFoundResponse;
    };
}>;
export {};
//# sourceMappingURL=discovery.d.ts.map