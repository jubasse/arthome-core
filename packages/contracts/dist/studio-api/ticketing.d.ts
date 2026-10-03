import { z } from 'zod';
import { PRICE_TIERS, RefundReason } from '@arthome/core';
import type { VocabularyIn, VocabularyOut } from '@arthome/core/schema';
import { MoneyOut } from '@arthome/core/schema';
import { ChannelIdParameter, ConflictResponse, DateIdParameter, ForbiddenResponse, IdempotencyKeyParameter, IfRightsVersionParameter, NotFoundResponse, SurfaceParameter, TraceparentParameter } from './components.js';
import { StudioEnvelopeMetaSchema, StudioErrorEnvelopeSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, QueryParameter, Route } from '../http/index.js';
import { DateSalesPaneSchema } from '../studio-money/index.js';
declare const REFUND_SEAT_REFUND_REASON_CODE: readonly [
    typeof RefundReason.DATE_CANCELLED,
    typeof RefundReason.GOODWILL,
    typeof RefundReason.DUPLICATE,
    typeof RefundReason.DISPUTE
];
export declare const getDateTicketsPane: Route<{
    method: 'get';
    path: '/v1/dates/{dateId}/panes/tickets';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof DateSalesPaneSchema;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
        404: typeof NotFoundResponse;
    };
}>;
export declare const setDatePrices: Route<{
    method: 'put';
    path: '/v1/dates/{dateId}/prices';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        expectedVersion: z.ZodInt;
        tiers: z.ZodArray<z.ZodObject<{
            tier: VocabularyIn<typeof PRICE_TIERS>;
            amountMinor: z.ZodInt;
            currencyCode: z.ZodString;
            active: z.ZodBoolean;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof DateSalesPaneSchema;
        }, z.core.$loose>>>;
        409: JsonResponse<typeof StudioErrorEnvelopeSchema>;
    };
}>;
export declare const openCapacityTier: Route<{
    method: 'post';
    path: '/v1/dates/{dateId}/capacity-tiers';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        additionalCapacity: z.ZodInt;
        expectedVersion: z.ZodInt;
        notifyWaitlist: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                sales: z.ZodOptional<typeof DateSalesPaneSchema>;
                waitlistNotified: z.ZodOptional<z.ZodInt>;
                priorityUntil: z.ZodOptional<z.ZodString>;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        409: JsonResponse<typeof StudioErrorEnvelopeSchema>;
    };
}>;
export declare const setTechnicalProvision: Route<{
    method: 'put';
    path: '/v1/dates/{dateId}/technical-provision';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        provisionedCapacity: z.ZodInt;
        expectedVersion: z.ZodInt;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof DateSalesPaneSchema;
        }, z.core.$loose>>>;
        409: JsonResponse<typeof StudioErrorEnvelopeSchema>;
    };
}>;
export declare const refundSeat: Route<{
    method: 'post';
    path: '/v1/seats/{seatId}/refund';
    parameters: readonly [
        PathParameter<'seatId', z.ZodString>,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        refundReasonCode: VocabularyIn<typeof REFUND_SEAT_REFUND_REASON_CODE>;
        partialAmountMinor: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                refunded: z.ZodOptional<typeof MoneyOut>;
                commissionRefunded: z.ZodOptional<typeof MoneyOut>;
                payoutId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
        409: typeof ConflictResponse;
    };
}>;
export declare const issueComplimentary: Route<{
    method: 'post';
    path: '/v1/dates/{dateId}/complimentaries';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        categoryId: z.ZodString;
        quantity: z.ZodInt;
        note: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    responses: {
        201: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                seatCodes: z.ZodOptional<z.ZodArray<z.ZodString>>;
                sales: z.ZodOptional<typeof DateSalesPaneSchema>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        409: typeof ConflictResponse;
    };
}>;
export declare const getChannelTicketing: Route<{
    method: 'get';
    path: '/v1/channels/{channelId}/ticketing';
    parameters: readonly [
        typeof ChannelIdParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        QueryParameter<'from', z.ZodString, true>,
        QueryParameter<'to', z.ZodString, true>
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                byTier: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    tier: z.ZodOptional<VocabularyOut>;
                    seatsSold: z.ZodOptional<z.ZodInt>;
                    gross: z.ZodOptional<typeof MoneyOut>;
                }, z.core.$loose>>>;
                waitlistByDate: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    dateId: z.ZodOptional<z.ZodString>;
                    title: z.ZodOptional<z.ZodString>;
                    waitlistCount: z.ZodOptional<z.ZodInt>;
                }, z.core.$loose>>>;
                complimentaries: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    categoryId: z.ZodOptional<z.ZodString>;
                    issued: z.ZodOptional<z.ZodInt>;
                    allocated: z.ZodOptional<z.ZodInt>;
                }, z.core.$loose>>>;
                pendingRequests: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    requestId: z.ZodString;
                    kind: VocabularyOut;
                    dateId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    seatId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    amount: z.ZodOptional<typeof MoneyOut>;
                    openedAt: z.ZodString;
                    respondBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, z.core.$loose>>>;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
    };
}>;
export {};
//# sourceMappingURL=ticketing.d.ts.map