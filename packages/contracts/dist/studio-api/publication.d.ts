import { z } from 'zod';
import { DATE_OUTCOMES, PUBLICATION_PROMISES, PublicationState, REPLAY_POLICIES } from '@arthome/core';
import type { VocabularyIn, VocabularyOut, VocabularyOutNullable } from '@arthome/core/schema';
import { MoneyOut } from '@arthome/core/schema';
import { ChannelIdParameter, ConflictResponse, DateIdParameter, ForbiddenResponse, IdempotencyKeyParameter, IfRightsVersionParameter, NotFoundResponse, SurfaceParameter, TraceparentParameter } from './components.js';
import { StudioEnvelopeMetaSchema, StudioErrorEnvelopeSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, Route } from '../http/index.js';
import { DateSheetSchema, PublicationSchema } from '../studio-stage/index.js';
import { StudioLocalizedTextSchema } from '../text/index.js';
declare const MOVE_DATE_PUBLICATION_STATE_TO: readonly [
    typeof PublicationState.DRAFT,
    typeof PublicationState.RESERVE,
    typeof PublicationState.SCHEDULED,
    typeof PublicationState.TECHNICAL,
    typeof PublicationState.REPLAY_ONLINE
];
export declare const createDateDraft: Route<{
    method: 'post';
    path: '/v1/channels/{channelId}/dates';
    parameters: readonly [
        typeof ChannelIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        dateId: z.ZodString;
        showId: z.ZodString;
        venueId: z.ZodString;
        startsAt: z.ZodString;
        replayPolicy: VocabularyIn<typeof REPLAY_POLICIES>;
        replayWindowHours: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    }, z.core.$strip>>;
    responses: {
        201: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof DateSheetSchema;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
        409: typeof ConflictResponse;
    };
}>;
export declare const getDateSheet: Route<{
    method: 'get';
    path: '/v1/dates/{dateId}/sheet';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof DateSheetSchema;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
        404: typeof NotFoundResponse;
    };
}>;
export declare const getDatePublicPane: Route<{
    method: 'get';
    path: '/v1/dates/{dateId}/panes/public';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                title: z.ZodOptional<z.ZodString>;
                categoryId: z.ZodOptional<z.ZodString>;
                genreIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
                tagIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
                synopsis: z.ZodOptional<typeof StudioLocalizedTextSchema>;
                slug: z.ZodOptional<z.ZodString>;
                canonicalUrl: z.ZodOptional<z.ZodString>;
                rights: z.ZodOptional<z.ZodObject<{
                    scope: z.ZodOptional<VocabularyOut>;
                    blackoutCountries: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    blackoutReasonCode: z.ZodOptional<VocabularyOutNullable>;
                }, z.core.$loose>>;
                version: z.ZodOptional<z.ZodInt>;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
        404: typeof NotFoundResponse;
    };
}>;
export declare const getDateReplayPane: Route<{
    method: 'get';
    path: '/v1/dates/{dateId}/panes/replay';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                policy: z.ZodOptional<VocabularyOut>;
                windowHours: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
                assetReady: z.ZodOptional<z.ZodBoolean>;
                durationSec: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
                availableFrom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                expiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                unitPrice: z.ZodOptional<typeof MoneyOut>;
                views: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
                revenue: z.ZodOptional<typeof MoneyOut>;
                version: z.ZodOptional<z.ZodInt>;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
        404: typeof NotFoundResponse;
    };
}>;
export declare const moveDatePublicationState: Route<{
    method: 'post';
    path: '/v1/dates/{dateId}/publication/transitions';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        to: VocabularyIn<typeof MOVE_DATE_PUBLICATION_STATE_TO>;
        expectedVersion: z.ZodInt;
        acknowledgedPromiseCode: z.ZodOptional<z.ZodLiteral<(typeof PUBLICATION_PROMISES)[number] | null>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof PublicationSchema;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
        409: JsonResponse<typeof StudioErrorEnvelopeSchema>;
    };
}>;
export declare const setDateReplayPolicy: Route<{
    method: 'put';
    path: '/v1/dates/{dateId}/replay-policy';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        policy: VocabularyIn<typeof REPLAY_POLICIES>;
        windowHours: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
        expectedVersion: z.ZodInt;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof PublicationSchema;
        }, z.core.$loose>>>;
        409: JsonResponse<typeof StudioErrorEnvelopeSchema>;
    };
}>;
export declare const deleteDate: Route<{
    method: 'delete';
    path: '/v1/dates/{dateId}';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                deleted: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        409: JsonResponse<typeof StudioErrorEnvelopeSchema>;
        404: typeof NotFoundResponse;
    };
}>;
export declare const duplicateDate: Route<{
    method: 'post';
    path: '/v1/dates/{dateId}/duplicate';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        newDateId: z.ZodString;
        startsAt: z.ZodString;
        applyToSeries: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    }, z.core.$strip>>;
    responses: {
        201: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof DateSheetSchema;
        }, z.core.$loose>>>;
        409: typeof ConflictResponse;
    };
}>;
export declare const decideDateOutcome: Route<{
    method: 'post';
    path: '/v1/dates/{dateId}/outcome';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        outcome: VocabularyIn<typeof DATE_OUTCOMES>;
        message: z.ZodObject<{
            contentLanguage: z.ZodString;
            text: z.ZodString;
        }, z.core.$strip>;
        rescheduledTo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        expectedVersion: z.ZodInt;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                outcome: z.ZodOptional<z.ZodString>;
                declaredAt: z.ZodOptional<z.ZodString>;
                moneyEffectCode: z.ZodOptional<z.ZodString>;
                affectedSeats: z.ZodOptional<z.ZodInt>;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        403: JsonResponse<typeof StudioErrorEnvelopeSchema>;
        409: typeof ConflictResponse;
    };
}>;
export {};
//# sourceMappingURL=publication.d.ts.map