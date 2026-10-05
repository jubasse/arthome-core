/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */
import type { ApiErrorCode, ChatErrorCode, OrderErrorCode } from '@arthome/core';
import type { DateDetailSchema } from '../../catalog/index.js';
import type { ChatMessageSchema, ReactionQuotaSchema } from '../../engagement/index.js';
import type { IdentifiedAccess, ItemResponse, JsonRequestBody, PageResponse, Route } from '../../http/index.js';
import type { SalesQueuePositionSchema, SeatQuoteSchema } from '../../ticketing/index.js';
import type { CursorParameter, DateIdParameter, IdempotencyKeyParameter, LimitParameter, SurfaceParameter, TraceparentParameter, storefrontConventions, viewer } from '../components.js';
import type { DateAvailabilitySchema, QuoteSeatBodySchema, SendChatMessageBodySchema, SendReactionBodySchema, SinceSeqParameter, WaitlistDepartureSchema, WaitlistRegistrationSchema } from './schemas.js';
export type GetDateDetailRoute = Route<{
    method: 'get';
    version: 1;
    path: '/dates/{dateId}';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, true>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof DateDetailSchema, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    };
}>;
export type RefreshDateAvailabilityRoute = Route<{
    method: 'get';
    version: 1;
    path: '/dates/{dateId}/availability';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, true>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof DateAvailabilitySchema, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    };
}>;
export type QuoteSeatRoute = Route<{
    method: 'post';
    version: 1;
    path: '/dates/{dateId}/seat-quote';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<typeof QuoteSeatBodySchema, true>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof SeatQuoteSchema, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED | typeof OrderErrorCode.CONTRIBUTION_OUT_OF_RANGE | typeof OrderErrorCode.SALES_CLOSED | typeof OrderErrorCode.TIER_UNAVAILABLE)[];
    };
}>;
export type EnterSalesQueueRoute = Route<{
    method: 'post';
    version: 1;
    path: '/dates/{dateId}/sales-queue/enter';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof SalesQueuePositionSchema, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type GetSalesQueuePositionRoute = Route<{
    method: 'get';
    version: 1;
    path: '/dates/{dateId}/sales-queue';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof SalesQueuePositionSchema, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    };
}>;
export type JoinWaitlistRoute = Route<{
    method: 'put';
    version: 1;
    path: '/dates/{dateId}/waitlist';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof WaitlistRegistrationSchema, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type LeaveWaitlistRoute = Route<{
    method: 'delete';
    version: 1;
    path: '/dates/{dateId}/waitlist';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof WaitlistDepartureSchema, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type ListChatMessagesRoute = Route<{
    method: 'get';
    version: 1;
    path: '/dates/{dateId}/chat/messages';
    parameters: readonly [
        typeof DateIdParameter,
        typeof CursorParameter,
        typeof LimitParameter,
        typeof SinceSeqParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: PageResponse<typeof storefrontConventions, typeof ChatMessageSchema>;
    };
    errorCodes: {
        400: readonly (typeof ApiErrorCode.SCHEMA_INVALID)[];
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    };
}>;
export type SendChatMessageRoute = Route<{
    method: 'post';
    version: 1;
    path: '/dates/{dateId}/chat/messages';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<typeof SendChatMessageBodySchema, true>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        201: ItemResponse<typeof storefrontConventions, typeof ChatMessageSchema, unknown>;
    };
    errorCodes: {
        403: readonly (typeof ChatErrorCode.HOLDERS_ONLY)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
        429: readonly (typeof ChatErrorCode.RATE_LIMITED)[];
    };
}>;
export type SendReactionRoute = Route<{
    method: 'post';
    version: 1;
    path: '/dates/{dateId}/chat/reactions';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<typeof SendReactionBodySchema, true>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof ReactionQuotaSchema, unknown>;
    };
    errorCodes: {
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
        429: readonly (typeof ChatErrorCode.RATE_LIMITED)[];
    };
}>;
//# sourceMappingURL=types.d.ts.map