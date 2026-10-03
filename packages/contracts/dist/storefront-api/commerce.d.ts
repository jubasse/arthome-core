import { z } from 'zod';
import { PLAN_TIERS, PRICE_TIERS } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { MoneyOut } from '@arthome/core/schema';
import { AdmissionTokenParameter, BadRequestResponse, ConflictResponse, CsrfRefusedResponse, DateIdParameter, GoneResponse, IdempotencyKeyParameter, LateEntryAcknowledgedParameter, NotFoundResponse, SurfaceParameter, TooManyRequestsResponse, TraceparentParameter, UnauthorizedResponse, UnavailableResponse } from './components.js';
import { DateCardSchema, PriceTierSchema } from '../catalog/index.js';
import { StorefrontEnvelopeMetaSchema, StorefrontErrorEnvelopeSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, Route } from '../http/index.js';
import { CartQuoteSchema, CartSchema, OrderSchema, PaymentHandoffSchema, PlanSchema, SalesQueuePositionSchema, SeatQuoteSchema, SubscriptionSchema, TicketCardSchema } from '../ticketing/index.js';
declare const CANCEL_SEAT_CANCEL_REASON_CODE: readonly ["viewer_request"];
export declare const listPlans: Route<{
    method: 'get';
    version: 1;
    path: '/plans';
    parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            items: z.ZodArray<typeof PlanSchema>;
        }, z.core.$loose>>>;
        503: typeof UnavailableResponse;
    };
}>;
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
    method: 'put';
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
export declare const purchaseSeat: Route<{
    method: 'post';
    version: 1;
    path: '/orders/seats';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof AdmissionTokenParameter,
        typeof LateEntryAcknowledgedParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        dateId: z.ZodString;
        tier: VocabularyIn<typeof PRICE_TIERS>;
        quantity: z.ZodInt;
        expectedTotal: typeof MoneyOut;
        contributionMinor: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
        applyCreditId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profileId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        declaredTaxLocation: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            country: z.ZodOptional<z.ZodString>;
            subdivision: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            postalCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
    responses: {
        201: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                tickets: z.ZodArray<typeof TicketCardSchema>;
                date: typeof DateCardSchema;
                order: typeof OrderSchema;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        202: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof PaymentHandoffSchema;
        }, z.core.$loose>>>;
        400: typeof BadRequestResponse;
        401: typeof UnauthorizedResponse;
        403: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
        409: typeof ConflictResponse;
        503: typeof UnavailableResponse;
    };
}>;
export declare const getOrder: Route<{
    method: 'get';
    version: 1;
    path: '/orders/{orderId}';
    parameters: readonly [
        PathParameter<'orderId', z.ZodString>,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                order: typeof OrderSchema;
                tickets: z.ZodOptional<z.ZodArray<typeof TicketCardSchema>>;
                handoff: z.ZodOptional<typeof PaymentHandoffSchema>;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
    };
}>;
export declare const cancelSeat: Route<{
    method: 'post';
    version: 1;
    path: '/seats/{seatId}/cancel';
    parameters: readonly [
        PathParameter<'seatId', z.ZodString>,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        cancelReasonCode: z.ZodOptional<VocabularyIn<typeof CANCEL_SEAT_CANCEL_REASON_CODE>>;
    }, z.core.$strip>, false>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                ticket: z.ZodOptional<typeof TicketCardSchema>;
                date: z.ZodOptional<typeof DateCardSchema>;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
        409: typeof ConflictResponse;
        403: typeof CsrfRefusedResponse;
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
export declare const getCart: Route<{
    method: 'get';
    version: 1;
    path: '/cart';
    parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof CartSchema;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
    };
}>;
export declare const addCartLine: Route<{
    method: 'post';
    version: 1;
    path: '/cart/lines';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        itemId: z.ZodString;
        variantId: z.ZodString;
        quantity: z.ZodInt;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof CartSchema;
        }, z.core.$loose>>>;
        409: typeof ConflictResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const updateCartLine: Route<{
    method: 'patch';
    version: 1;
    path: '/cart/lines/{lineId}';
    parameters: readonly [
        PathParameter<'lineId', z.ZodString>,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        quantity: z.ZodInt;
        expectedVersion: z.ZodInt;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof CartSchema;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
        409: typeof ConflictResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const removeCartLine: Route<{
    method: 'delete';
    version: 1;
    path: '/cart/lines/{lineId}';
    parameters: readonly [
        PathParameter<'lineId', z.ZodString>,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof CartSchema;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const quoteCart: Route<{
    method: 'post';
    version: 1;
    path: '/cart/quote';
    parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
    requestBody: JsonRequestBody<z.ZodObject<{
        shippingCountryCode: z.ZodString;
        shippingPostalCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof CartQuoteSchema;
        }, z.core.$loose>>>;
        409: typeof ConflictResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const checkoutCart: Route<{
    method: 'post';
    version: 1;
    path: '/orders/merch';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        quoteId: z.ZodString;
        shippingAddress: z.ZodObject<{
            line1: z.ZodString;
            line2: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            city: z.ZodString;
            postalCode: z.ZodString;
            countryCode: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>>;
    responses: {
        201: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                orders: z.ZodArray<typeof OrderSchema>;
                cart: typeof CartSchema;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        202: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof PaymentHandoffSchema;
        }, z.core.$loose>>>;
        409: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
        410: typeof GoneResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const setSubscriptionPlan: Route<{
    method: 'put';
    version: 1;
    path: '/subscription';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        planTier: VocabularyIn<typeof PLAN_TIERS>;
        paymentMethodRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof SubscriptionSchema;
        }, z.core.$loose>>>;
        202: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof PaymentHandoffSchema;
        }, z.core.$loose>>>;
        402: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
        409: typeof ConflictResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const cancelSubscription: Route<{
    method: 'delete';
    version: 1;
    path: '/subscription';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof SubscriptionSchema;
        }, z.core.$loose>>>;
        409: typeof ConflictResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export {};
//# sourceMappingURL=commerce.d.ts.map