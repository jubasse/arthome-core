import { z } from 'zod';
import { MODERATION_REASONS } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { CsrfRefusedResponse, CursorParameter, DateIdParameter, GoneResponse, IdempotencyKeyParameter, LimitParameter, NotFoundResponse, SurfaceParameter, TooManyRequestsResponse, TraceparentParameter } from './components.js';
import { ChatMessageSchema, ReactionQuotaSchema } from '../engagement/index.js';
import { StorefrontEnvelopeMetaSchema, StorefrontErrorEnvelopeSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, QueryParameter, Route } from '../http/index.js';
import { StorefrontCursorPageInfoSchema } from '../pagination/index.js';
declare const SEND_REACTION_REACTION_ID: readonly ["applause", "heart", "bravo", "laugh", "wow", "sad"];
export declare const listChatMessages: Route<{
    method: 'get';
    path: '/v1/dates/{dateId}/chat/messages';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof CursorParameter,
        typeof LimitParameter,
        QueryParameter<'sinceSeq', z.ZodNumber>
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            items: z.ZodArray<typeof ChatMessageSchema>;
            page: typeof StorefrontCursorPageInfoSchema;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
        410: typeof GoneResponse;
    };
}>;
export declare const sendChatMessage: Route<{
    method: 'post';
    path: '/v1/dates/{dateId}/chat/messages';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        text: z.ZodString;
        atMediaSec: z.ZodInt;
    }, z.core.$strip>>;
    responses: {
        201: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof ChatMessageSchema;
        }, z.core.$loose>>>;
        403: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
        429: typeof TooManyRequestsResponse;
    };
}>;
export declare const sendReaction: Route<{
    method: 'post';
    path: '/v1/dates/{dateId}/chat/reactions';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        reactionId: VocabularyIn<typeof SEND_REACTION_REACTION_ID>;
        atMediaSec: z.ZodInt;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof ReactionQuotaSchema;
        }, z.core.$loose>>>;
        429: typeof TooManyRequestsResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const reportChatMessage: Route<{
    method: 'post';
    path: '/v1/chat/messages/{messageId}/report';
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
export {};
//# sourceMappingURL=chat.d.ts.map