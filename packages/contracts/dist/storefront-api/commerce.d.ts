import { z } from 'zod';
import { PRICE_TIERS } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { MoneyOut } from '@arthome/core/schema';
import { ConflictResponse, CsrfRefusedResponse, DateIdParameter, IdempotencyKeyParameter, NotFoundResponse, SurfaceParameter, TooManyRequestsResponse, TraceparentParameter, UnauthorizedResponse } from './components.js';
import { DateCardSchema, PriceTierSchema } from '../catalog/index.js';
import { StorefrontEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, Route } from '../http/index.js';
import { SalesQueuePositionSchema, SeatQuoteSchema } from '../ticketing/index.js';
export declare const refreshDateAvailability: Route<{
    method: 'get';
    version: 1;
    path: '/dates/{dateId}/availability';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                seatsAvailable: z.ZodOptional<z.ZodInt>;
                waitlistCount: z.ZodOptional<z.ZodInt>;
                fillRateBps: z.ZodOptional<z.ZodInt>;
                soldOut: z.ZodOptional<z.ZodBoolean>;
                priceTiers: z.ZodOptional<z.ZodArray<typeof PriceTierSchema>>;
                serviceFeePerSeat: z.ZodOptional<typeof MoneyOut>;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
    };
}>;
export declare const quoteSeat: Route<{
    method: 'post';
    version: 1;
    path: '/dates/{dateId}/seat-quote';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        tier: VocabularyIn<typeof PRICE_TIERS>;
        quantity: z.ZodInt;
        contributionMinor: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
        applyCreditId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof SeatQuoteSchema;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
        409: typeof ConflictResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const enterSalesQueue: Route<{
    method: 'post';
    version: 1;
    path: '/dates/{dateId}/sales-queue/enter';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof SalesQueuePositionSchema;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
        403: typeof CsrfRefusedResponse;
        404: typeof NotFoundResponse;
    };
}>;
export declare const getSalesQueuePosition: Route<{
    method: 'get';
    version: 1;
    path: '/dates/{dateId}/sales-queue';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof SalesQueuePositionSchema;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
        404: typeof NotFoundResponse;
        429: typeof TooManyRequestsResponse;
    };
}>;
export declare const joinWaitlist: Route<{
    method: 'put';
    version: 1;
    path: '/dates/{dateId}/waitlist';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                joined: z.ZodBoolean;
                rankDisclosed: z.ZodBoolean;
                rank: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
                priorityWindowHours: z.ZodOptional<z.ZodInt>;
                date: z.ZodOptional<typeof DateCardSchema>;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
        409: typeof ConflictResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const leaveWaitlist: Route<{
    method: 'delete';
    version: 1;
    path: '/dates/{dateId}/waitlist';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                joined: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
//# sourceMappingURL=commerce.d.ts.map