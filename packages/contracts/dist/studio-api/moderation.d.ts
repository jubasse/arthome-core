import { z } from 'zod';
import { MODERATION_REASONS, MODERATION_VERDICTS } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { IdempotencyKeyParameter, IfRightsVersionParameter, NotFoundResponse, SurfaceParameter, TraceparentParameter } from './components.js';
import { StudioEnvelopeMetaSchema, StudioErrorEnvelopeSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, Route } from '../http/index.js';
import { ModerationItemSchema } from '../studio-desk/index.js';
export declare const claimModerationItem: Route<{
    method: 'post';
    version: 1;
    path: '/moderation/items/{itemId}/claim';
    parameters: readonly [
        PathParameter<'itemId', z.ZodString>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof ModerationItemSchema;
        }, z.core.$loose>>>;
        409: JsonResponse<typeof StudioErrorEnvelopeSchema>;
    };
}>;
export declare const releaseModerationItem: Route<{
    method: 'delete';
    version: 1;
    path: '/moderation/items/{itemId}/claim';
    parameters: readonly [
        PathParameter<'itemId', z.ZodString>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof ModerationItemSchema;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
    };
}>;
export declare const settleModerationItem: Route<{
    method: 'post';
    version: 1;
    path: '/moderation/items/{itemId}/verdict';
    parameters: readonly [
        PathParameter<'itemId', z.ZodString>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        verdict: VocabularyIn<typeof MODERATION_VERDICTS>;
        expectedDecisionVersion: z.ZodInt;
        reason: z.ZodOptional<VocabularyIn<typeof MODERATION_REASONS>>;
        muteUntil: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        expectedVersion: z.ZodOptional<z.ZodInt>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof ModerationItemSchema;
        }, z.core.$loose>>>;
        409: JsonResponse<typeof StudioErrorEnvelopeSchema>;
    };
}>;
//# sourceMappingURL=moderation.d.ts.map