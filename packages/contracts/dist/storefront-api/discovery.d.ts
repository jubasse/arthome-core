import { z } from 'zod';
import type { VocabularyIn, VocabularyOut } from '@arthome/core/schema';
import { BadRequestResponse, CursorParameter, GoneResponse, LimitParameter, NotFoundResponse, SurfaceParameter, TraceparentParameter, UnavailableResponse } from './components.js';
import { ArtistSummarySchema, DateCardSchema, RailSchema } from '../catalog/index.js';
import { StorefrontEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonResponse, PathParameter, QueryParameter, Route } from '../http/index.js';
import { StorefrontCursorPageInfoSchema } from '../pagination/index.js';
declare const LIST_REPLAYS_SORT: readonly ["expiring_first", "recent", "popularity"];
declare const RESOLVE_PUBLIC_LINK_KIND: readonly ["date", "show", "artist", "category"];
export declare const listReplays: Route<{
    method: 'get';
    version: 1;
    path: '/replays';
    parameters: readonly [
        typeof CursorParameter,
        typeof LimitParameter,
        QueryParameter<'sort', z.ZodDefault<VocabularyIn<typeof LIST_REPLAYS_SORT>>>,
        QueryParameter<'categoryId', z.ZodString>,
        typeof SurfaceParameter,
        typeof TraceparentParameter
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
    version: 1;
    path: '/rails/{railId}';
    parameters: readonly [
        PathParameter<'railId', z.ZodString>,
        typeof CursorParameter,
        typeof LimitParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
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
    version: 1;
    path: '/resolve';
    parameters: readonly [
        QueryParameter<'url', z.ZodString>,
        QueryParameter<'kind', VocabularyIn<typeof RESOLVE_PUBLIC_LINK_KIND>>,
        QueryParameter<'slug', z.ZodString>,
        typeof SurfaceParameter,
        typeof TraceparentParameter
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