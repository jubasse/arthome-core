import { z } from 'zod';
import { DisplayState } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { CsrfRefusedResponse, DateIdParameter, NotFoundResponse, SurfaceParameter, TraceparentParameter, UnavailableResponse } from './components.js';
import { StorefrontEnvelopeMetaSchema, StorefrontErrorEnvelopeSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, Route } from '../http/index.js';
import { PlaybackRenewalSchema, PlaybackTicketSchema } from '../streaming/index.js';
declare const OPEN_PLAYBACK_KIND: readonly [typeof DisplayState.LIVE, typeof DisplayState.REPLAY];
declare const OPEN_PLAYBACK_DRM_SYSTEMS: readonly ["fairplay", "widevine", "playready"];
export declare const openPlayback: Route<{
    method: 'post';
    version: 1;
    path: '/playback/{dateId}/open';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        deviceId: z.ZodString;
        kind: VocabularyIn<typeof OPEN_PLAYBACK_KIND>;
        profileId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        capabilities: z.ZodOptional<z.ZodObject<{
            drmSystems: z.ZodOptional<z.ZodArray<VocabularyIn<typeof OPEN_PLAYBACK_DRM_SYSTEMS>>>;
            hardwareSecureDecode: z.ZodOptional<z.ZodBoolean>;
            maxHeightPx: z.ZodOptional<z.ZodInt>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof PlaybackTicketSchema;
        }, z.core.$loose>>>;
        403: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
        404: typeof NotFoundResponse;
        503: typeof UnavailableResponse;
    };
}>;
export declare const renewPlaybackTicket: Route<{
    method: 'post';
    version: 1;
    path: '/playback/sessions/{sessionId}/renew';
    parameters: readonly [
        PathParameter<'sessionId', z.ZodString>,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof PlaybackRenewalSchema;
        }, z.core.$loose>>>;
        403: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
        404: typeof NotFoundResponse;
        503: typeof UnavailableResponse;
    };
}>;
export declare const releasePlayback: Route<{
    method: 'post';
    version: 1;
    path: '/playback/sessions/{sessionId}/release';
    parameters: readonly [
        PathParameter<'sessionId', z.ZodString>,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                released: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const recordPlaybackPosition: Route<{
    method: 'put';
    version: 1;
    path: '/me/progress/{dateId}';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        positionSec: z.ZodInt;
        deviceId: z.ZodString;
        completed: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                positionSec: z.ZodOptional<z.ZodInt>;
                version: z.ZodOptional<z.ZodInt>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export {};
//# sourceMappingURL=playback.d.ts.map