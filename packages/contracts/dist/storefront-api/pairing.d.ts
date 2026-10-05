import { z } from 'zod';
import type { VocabularyIn } from '@arthome/core/schema';
import { AdmissionTokenParameter, BadRequestResponse, CsrfRefusedResponse, GoneResponse, IdempotencyKeyParameter, NotFoundResponse, SurfaceParameter, TooManyRequestsResponse, TraceparentParameter, UnauthorizedResponse } from './components.js';
import { StorefrontEnvelopeMetaSchema, StorefrontErrorEnvelopeSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, Route } from '../http/index.js';
import { DevicePairingSchema, PairingOutcomeSchema } from '../identity/index.js';
declare const CREATE_PAIRING_INTENT: readonly ["signin", "seat", "plan", "payment_method", "merch"];
declare const DECIDE_PAIRING_DECISION: readonly ["approve", "deny"];
export declare const createPairing: Route<{
    method: 'post';
    version: 1;
    path: '/pairings';
    parameters: readonly [
        typeof AdmissionTokenParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        intent: VocabularyIn<typeof CREATE_PAIRING_INTENT>;
        deviceId: z.ZodString;
        payload: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>>;
    }, z.core.$strip>>;
    responses: {
        201: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof DevicePairingSchema;
        }, z.core.$loose>>>;
        400: typeof BadRequestResponse;
        401: typeof UnauthorizedResponse;
        403: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
        429: typeof TooManyRequestsResponse;
    };
}>;
export declare const pollPairing: Route<{
    method: 'get';
    version: 1;
    path: '/pairings/{pairingId}';
    parameters: readonly [
        PathParameter<'pairingId', z.ZodString>,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof PairingOutcomeSchema;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
        410: typeof GoneResponse;
        429: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
    };
}>;
export declare const cancelPairing: Route<{
    method: 'delete';
    version: 1;
    path: '/pairings/{pairingId}';
    parameters: readonly [
        PathParameter<'pairingId', z.ZodString>,
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof PairingOutcomeSchema;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
        409: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const engagePairing: Route<{
    method: 'post';
    version: 1;
    path: '/pairings/{pairingId}/engagement';
    parameters: readonly [
        PathParameter<'pairingId', z.ZodString>,
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        note: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>, false>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof PairingOutcomeSchema;
        }, z.core.$loose>>>;
        403: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
        410: typeof GoneResponse;
    };
}>;
export declare const decidePairing: Route<{
    method: 'post';
    version: 1;
    path: '/pairings/{pairingId}/decision';
    parameters: readonly [
        PathParameter<'pairingId', z.ZodString>,
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        decision: VocabularyIn<typeof DECIDE_PAIRING_DECISION>;
        outcomeRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof PairingOutcomeSchema;
        }, z.core.$loose>>>;
        403: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
        410: typeof GoneResponse;
    };
}>;
export {};
//# sourceMappingURL=pairing.d.ts.map