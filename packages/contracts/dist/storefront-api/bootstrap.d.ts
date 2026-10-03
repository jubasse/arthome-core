import { z } from 'zod';
import { DEVICE_KINDS } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { BadRequestResponse, IdempotencyKeyParameter, SurfaceParameter, TraceparentParameter, UnauthorizedResponse, UnavailableResponse, ViewerTimezoneParameter } from './components.js';
import { ChangeFeedSchema } from '../engagement/index.js';
import { StorefrontEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, QueryParameter, Route } from '../http/index.js';
import { ViewerContextSchema } from '../identity/index.js';
declare const LIST_CHANGES_SCOPE: readonly ["profile", "device"];
export declare const registerDevice: Route<{
    method: 'post';
    path: '/v1/devices';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        kind: VocabularyIn<typeof DEVICE_KINDS>;
        label: z.ZodString;
        osVersion: z.ZodOptional<z.ZodString>;
        appVersion: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    responses: {
        201: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                deviceId: z.ZodString;
                deviceToken: z.ZodString;
                expiresAt: z.ZodString;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        400: typeof BadRequestResponse;
        503: typeof UnavailableResponse;
    };
}>;
export declare const getViewerContext: Route<{
    method: 'get';
    path: '/v1/viewer-context';
    parameters: readonly [
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof ViewerTimezoneParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof ViewerContextSchema;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
        503: typeof UnavailableResponse;
    };
}>;
export declare const listChanges: Route<{
    method: 'get';
    path: '/v1/changes';
    parameters: readonly [
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        QueryParameter<'since', z.ZodString, true>,
        QueryParameter<'scope', z.ZodDefault<VocabularyIn<typeof LIST_CHANGES_SCOPE>>>
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof ChangeFeedSchema;
        }, z.core.$loose>>>;
        400: typeof BadRequestResponse;
        401: typeof UnauthorizedResponse;
    };
}>;
export {};
//# sourceMappingURL=bootstrap.d.ts.map