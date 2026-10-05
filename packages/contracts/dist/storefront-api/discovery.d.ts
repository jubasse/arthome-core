import { z } from 'zod';
import type { VocabularyIn, VocabularyOut } from '@arthome/core/schema';
import { BadRequestResponse, NotFoundResponse, SurfaceParameter, TraceparentParameter } from './components.js';
import { ArtistSummarySchema, DateCardSchema } from '../catalog/index.js';
import { StorefrontEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonResponse, QueryParameter, Route } from '../http/index.js';
declare const RESOLVE_PUBLIC_LINK_KIND: readonly ["date", "show", "artist", "category"];
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