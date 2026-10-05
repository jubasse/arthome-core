import { z } from 'zod';
import { CHAT_MODES, FILTER_SEVERITIES } from '@arthome/core';
import type { VocabularyIn, VocabularyOut } from '@arthome/core/schema';
import { MoneyOut } from '@arthome/core/schema';
import { BadRequestResponse, ChannelIdParameter, ConflictResponse, ForbiddenResponse, IdempotencyKeyParameter, IfRightsVersionParameter, PageParameter, PageSizeParameter, SortByParameter, SortDirParameter, SurfaceParameter, TraceparentParameter } from './components.js';
import { StudioEnvelopeMetaSchema, StudioErrorEnvelopeSchema } from '../envelope/index.js';
import type { JsonRequestBody, PathParameter, JsonResponse, QueryParameter, Route } from '../http/index.js';
import { OffsetPageInfoSchema } from '../pagination/index.js';
import { JournalEntrySchema } from '../studio-desk/index.js';
import { MerchItemAdminSchema, UploadTicketSchema } from '../studio-stage/index.js';
declare const LIST_CHANNEL_REPLAYS_STATE: readonly ["online", "expired", "archived"];
declare const UPDATE_CHANNEL_SETTINGS_INGEST_PROTOCOL: readonly ["rtmps", "srt", "whip"];
declare const LIST_CHANNEL_JOURNAL_NATURE: readonly ["air", "mod", "event", "access", "money"];
declare const CREATE_UPLOAD_TICKET_PURPOSE: readonly ["poster", "wide", "avatar", "merch_image"];
declare const CREATE_UPLOAD_TICKET_CONTENT_TYPE: readonly ["image/jpeg", "image/png", "image/webp"];
export declare const deleteChannel: Route<{
    method: 'delete';
    version: 1;
    path: '/channels/{channelId}';
    parameters: readonly [
        typeof ChannelIdParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        reauthToken: z.ZodString;
        confirmName: z.ZodString;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                deleted: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        409: JsonResponse<typeof StudioErrorEnvelopeSchema>;
    };
}>;
export declare const listChannelReplays: Route<{
    method: 'get';
    version: 1;
    path: '/channels/{channelId}/replays';
    parameters: readonly [
        typeof ChannelIdParameter,
        typeof PageParameter,
        typeof PageSizeParameter,
        typeof SortByParameter,
        typeof SortDirParameter,
        QueryParameter<'state', VocabularyIn<typeof LIST_CHANNEL_REPLAYS_STATE>>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            items: z.ZodArray<z.ZodObject<{
                dateId: z.ZodString;
                title: z.ZodString;
                state: VocabularyOut;
                expiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                durationSec: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
                views: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
                revenue: z.ZodOptional<typeof MoneyOut>;
            }, z.core.$loose>>;
            page: typeof OffsetPageInfoSchema;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
    };
}>;
export declare const getChannelSettings: Route<{
    method: 'get';
    version: 1;
    path: '/channels/{channelId}/settings';
    parameters: readonly [
        typeof ChannelIdParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                identity: z.ZodOptional<z.ZodObject<{
                    publicName: z.ZodOptional<z.ZodString>;
                    slug: z.ZodOptional<z.ZodString>;
                    categoryId: z.ZodOptional<z.ZodString>;
                    verified: z.ZodOptional<z.ZodBoolean>;
                    version: z.ZodOptional<z.ZodInt>;
                }, z.core.$loose>>;
                moderationDefaults: z.ZodOptional<z.ZodObject<{
                    filterSeverity: z.ZodOptional<VocabularyOut>;
                    slowModeSec: z.ZodOptional<z.ZodInt>;
                    holdersOnly: z.ZodOptional<z.ZodBoolean>;
                    retroactiveFilter: z.ZodOptional<z.ZodBoolean>;
                    chatMode: z.ZodOptional<VocabularyOut>;
                    version: z.ZodOptional<z.ZodInt>;
                }, z.core.$loose>>;
                merchIntegration: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    source: z.ZodOptional<VocabularyOut>;
                    merchantUrl: z.ZodOptional<z.ZodString>;
                    connectedAt: z.ZodOptional<z.ZodString>;
                    lastSyncedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, z.core.$loose>>>;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
    };
}>;
export declare const updateChannelSettings: Route<{
    method: 'patch';
    version: 1;
    path: '/channels/{channelId}/settings';
    parameters: readonly [
        typeof ChannelIdParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        expectedVersion: z.ZodInt;
        moderationDefaults: z.ZodOptional<z.ZodObject<{
            filterSeverity: z.ZodOptional<VocabularyIn<typeof FILTER_SEVERITIES>>;
            slowModeSec: z.ZodOptional<z.ZodInt>;
            holdersOnly: z.ZodOptional<z.ZodBoolean>;
            retroactiveFilter: z.ZodOptional<z.ZodBoolean>;
            chatMode: z.ZodOptional<VocabularyIn<typeof CHAT_MODES>>;
        }, z.core.$strip>>;
        broadcastDefaults: z.ZodOptional<z.ZodObject<{
            ingestProtocol: z.ZodOptional<VocabularyIn<typeof UPDATE_CHANNEL_SETTINGS_INGEST_PROTOCOL>>;
            holdScreenAutoAfterSec: z.ZodOptional<z.ZodInt>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>>;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
        409: typeof ConflictResponse;
    };
}>;
export declare const listChannelJournal: Route<{
    method: 'get';
    version: 1;
    path: '/channels/{channelId}/journal';
    parameters: readonly [
        typeof ChannelIdParameter,
        typeof PageParameter,
        typeof PageSizeParameter,
        QueryParameter<'from', z.ZodString, true>,
        QueryParameter<'to', z.ZodString, true>,
        QueryParameter<'nature', VocabularyIn<typeof LIST_CHANNEL_JOURNAL_NATURE>>,
        QueryParameter<'dateId', z.ZodString>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            items: z.ZodArray<typeof JournalEntrySchema>;
            page: typeof OffsetPageInfoSchema;
        }, z.core.$loose>>>;
        400: typeof BadRequestResponse;
        403: typeof ForbiddenResponse;
    };
}>;
export declare const createUploadTicket: Route<{
    method: 'post';
    version: 1;
    path: '/uploads';
    parameters: readonly [
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        purpose: VocabularyIn<typeof CREATE_UPLOAD_TICKET_PURPOSE>;
        contentType: VocabularyIn<typeof CREATE_UPLOAD_TICKET_CONTENT_TYPE>;
        sizeBytes: z.ZodInt;
    }, z.core.$strip>>;
    responses: {
        201: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof UploadTicketSchema;
        }, z.core.$loose>>>;
        400: typeof BadRequestResponse;
    };
}>;
export declare const listChannelMerchItems: Route<{
    method: 'get';
    version: 1;
    path: '/channels/{channelId}/merch-items';
    parameters: readonly [
        typeof ChannelIdParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            items: z.ZodArray<typeof MerchItemAdminSchema>;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
    };
}>;
export declare const upsertMerchItem: Route<{
    method: 'put';
    version: 1;
    path: '/channels/{channelId}/merch-items/{itemId}';
    parameters: readonly [
        typeof ChannelIdParameter,
        PathParameter<'itemId', z.ZodString>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        showId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        labels: z.ZodArray<z.ZodObject<{
            contentLanguage: z.ZodString;
            text: z.ZodString;
        }, z.core.$strip>>;
        variants: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            stock: z.ZodInt;
            priceMinor: z.ZodInt;
            currencyCode: z.ZodString;
        }, z.core.$strip>>;
        expectedVersion: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof MerchItemAdminSchema;
        }, z.core.$loose>>>;
        409: typeof ConflictResponse;
    };
}>;
export declare const updateChannelIdentity: Route<{
    method: 'patch';
    version: 1;
    path: '/channels/{channelId}/identity';
    parameters: readonly [
        typeof ChannelIdParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        expectedVersion: z.ZodInt;
        publicName: z.ZodOptional<z.ZodString>;
        slug: z.ZodOptional<z.ZodString>;
        biography: z.ZodOptional<z.ZodArray<z.ZodObject<{
            contentLanguage: z.ZodString;
            text: z.ZodString;
        }, z.core.$strip>>>;
        categoryId: z.ZodOptional<z.ZodString>;
        avatarAssetId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            version: z.ZodOptional<z.ZodInt>;
            data: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>>;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
        409: typeof ConflictResponse;
    };
}>;
export {};
//# sourceMappingURL=channel.d.ts.map