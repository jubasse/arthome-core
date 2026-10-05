import { z } from 'zod';
import { MODERATION_REASONS } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { CsrfRefusedResponse, IdempotencyKeyParameter, NotFoundResponse, SurfaceParameter, TraceparentParameter } from './components.js';
import { StorefrontEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, Route } from '../http/index.js';
export declare const reportChatMessage: Route<{
    method: 'post';
    version: 1;
    path: '/chat/messages/{messageId}/report';
    parameters: readonly [
        PathParameter<'messageId', z.ZodString>,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        reason: VocabularyIn<typeof MODERATION_REASONS>;
    }, z.core.$strip>>;
    responses: {
        202: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                reported: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
//# sourceMappingURL=chat.d.ts.map