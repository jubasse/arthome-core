import { z } from 'zod';
import { AUDIENCE_SANCTIONS, CHAT_MODES, FILTER_SEVERITIES, MODERATION_REASONS, MODERATION_VERDICTS } from '@arthome/core';
import type { VocabularyIn, VocabularyOut } from '@arthome/core/schema';
import { ChannelIdParameter, ConflictResponse, CursorParameter, DateIdParameter, ForbiddenResponse, GoneResponse, IdempotencyKeyParameter, IfRightsVersionParameter, LimitParameter, NotFoundResponse, PageParameter, PageSizeParameter, SurfaceParameter, TraceparentParameter } from './components.js';
import { StudioEnvelopeMetaSchema, StudioErrorEnvelopeSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, QueryParameter, Route } from '../http/index.js';
import { OffsetPageInfoSchema, StudioCursorPageInfoSchema } from '../pagination/index.js';
import { AudienceMemberSchema, ChatPolicySchema, ModerationItemSchema } from '../studio-desk/index.js';
import { StudioLocalizedTextSchema } from '../text/index.js';
declare const LIST_MODERATION_QUEUE_FILTER: readonly ["all", "pending", "settled"];
export declare const getDateChatPane: Route<{
    method: 'get';
    version: 1;
    path: '/dates/{dateId}/panes/chat';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                policy: z.ZodOptional<typeof ChatPolicySchema>;
                throughputPerMinute: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
                pendingModerationCount: z.ZodOptional<z.ZodInt>;
                assignedModerators: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    personId: z.ZodOptional<z.ZodString>;
                    displayName: z.ZodOptional<z.ZodString>;
                }, z.core.$loose>>>;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
        404: typeof NotFoundResponse;
    };
}>;
export declare const setDateChatPolicy: Route<{
    method: 'put';
    version: 1;
    path: '/dates/{dateId}/chat-policy';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        expectedVersion: z.ZodInt;
        mode: z.ZodOptional<VocabularyIn<typeof CHAT_MODES>>;
        filterSeverity: z.ZodOptional<VocabularyIn<typeof FILTER_SEVERITIES>>;
        slowModeSec: z.ZodOptional<z.ZodInt>;
        holdersOnly: z.ZodOptional<z.ZodBoolean>;
        retroactiveFilter: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof ChatPolicySchema;
        }, z.core.$loose>>>;
        409: typeof ConflictResponse;
    };
}>;
export declare const listModerationQueue: Route<{
    method: 'get';
    version: 1;
    path: '/channels/{channelId}/moderation/queue';
    parameters: readonly [
        typeof ChannelIdParameter,
        typeof CursorParameter,
        typeof LimitParameter,
        QueryParameter<'dateId', z.ZodString>,
        QueryParameter<'filter', z.ZodDefault<VocabularyIn<typeof LIST_MODERATION_QUEUE_FILTER>>>,
        QueryParameter<'q', z.ZodString>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            items: z.ZodArray<typeof ModerationItemSchema>;
            page: typeof StudioCursorPageInfoSchema;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
        410: typeof GoneResponse;
    };
}>;
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
export declare const searchAudience: Route<{
    method: 'get';
    version: 1;
    path: '/channels/{channelId}/audience';
    parameters: readonly [
        typeof ChannelIdParameter,
        typeof PageParameter,
        typeof PageSizeParameter,
        QueryParameter<'q', z.ZodString>,
        QueryParameter<'presentOnDateId', z.ZodString>,
        QueryParameter<'sanction', VocabularyIn<typeof AUDIENCE_SANCTIONS>>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            items: z.ZodArray<typeof AudienceMemberSchema>;
            page: typeof OffsetPageInfoSchema;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
    };
}>;
export declare const sanctionAudienceMember: Route<{
    method: 'put';
    version: 1;
    path: '/channels/{channelId}/audience/{memberId}/sanction';
    parameters: readonly [
        typeof ChannelIdParameter,
        PathParameter<'memberId', z.ZodString>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        kind: VocabularyIn<typeof AUDIENCE_SANCTIONS>;
        expiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        reason: z.ZodOptional<VocabularyIn<typeof MODERATION_REASONS>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof AudienceMemberSchema;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
        404: typeof NotFoundResponse;
    };
}>;
export declare const addBannedWord: Route<{
    method: 'post';
    version: 1;
    path: '/channels/{channelId}/moderation/banned-words';
    parameters: readonly [
        typeof ChannelIdParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        word: z.ZodString;
        retroactive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    }, z.core.$strip>>;
    responses: {
        202: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                word: z.ZodOptional<z.ZodString>;
                reprocessing: z.ZodOptional<z.ZodBoolean>;
                estimatedAffectedMessages: z.ZodOptional<z.ZodInt>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
    };
}>;
export declare const removeBannedWord: Route<{
    method: 'delete';
    version: 1;
    path: '/channels/{channelId}/moderation/banned-words/{word}';
    parameters: readonly [
        typeof ChannelIdParameter,
        PathParameter<'word', z.ZodString>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                deleted: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
    };
}>;
export declare const listStudioChatMessages: Route<{
    method: 'get';
    version: 1;
    path: '/dates/{dateId}/chat/messages';
    parameters: readonly [
        typeof DateIdParameter,
        typeof CursorParameter,
        typeof LimitParameter,
        QueryParameter<'sinceSeq', z.ZodNumber>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            items: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                seq: z.ZodNumber;
                authorHandle: z.ZodString;
                atMediaSec: z.ZodInt;
                sentAt: z.ZodString;
                state: VocabularyOut;
                badge: VocabularyOut;
                body: typeof StudioLocalizedTextSchema;
            }, z.core.$loose>>;
            page: typeof StudioCursorPageInfoSchema;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
        410: typeof GoneResponse;
    };
}>;
export {};
//# sourceMappingURL=moderation.d.ts.map