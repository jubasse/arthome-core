/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */
import type { ApiErrorCode } from '@arthome/core';
import type { Header, IdentifiedAccess, ItemResponse, JsonRequestBody, Route } from '../../http/index.js';
import type { AdmissionTokenParameter, IdempotencyKeyParameter, LateEntryAcknowledgedParameter, SurfaceParameter, TraceparentParameter, storefrontConventions, viewer } from '../components.js';
import type { CheckoutCartBodySchema, MerchCheckoutAnswerSchema, OrderDetailSchema, OrderIdParameter, PurchaseSeatBodySchema, SeatPurchaseAnswerSchema } from './schemas.js';
import type { PaymentHandoffAnswerSchema } from '../subscription/schemas.js';
export type PurchaseSeatRoute = Route<{
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
    requestBody: JsonRequestBody<typeof PurchaseSeatBodySchema, true>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        201: {
            readonly description: 'Seats created, and the updated date.';
            readonly headers: {
                readonly 'X-Arthome-Served-At': Header;
            };
            readonly content: {
                readonly 'application/json': {
                    readonly schema: typeof SeatPurchaseAnswerSchema;
                };
            };
        };
        202: {
            readonly description: '**Strong authentication required** — the order exists, the payment is not complete. The\nsurface presents the payment element with the `clientSecret`, then follows the state through\n`getOrder`. It **never** concludes from the return URL.\n';
            readonly content: {
                readonly 'application/json': {
                    readonly schema: typeof PaymentHandoffAnswerSchema;
                };
            };
        };
    };
    errorCodes: {
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type CheckoutCartRoute = Route<{
    method: 'post';
    version: 1;
    path: '/orders/merch';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<typeof CheckoutCartBodySchema, true>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        201: {
            readonly description: 'One order per vendor.';
            readonly content: {
                readonly 'application/json': {
                    readonly schema: typeof MerchCheckoutAnswerSchema;
                };
            };
        };
        202: {
            readonly description: '**Strong authentication required.** See `PaymentHandoff` — the return URL concludes nothing, `getOrder` is authoritative.';
            readonly content: {
                readonly 'application/json': {
                    readonly schema: typeof PaymentHandoffAnswerSchema;
                };
            };
        };
    };
    errorCodes: {
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type GetOrderRoute = Route<{
    method: 'get';
    version: 1;
    path: '/orders/{orderId}';
    parameters: readonly [
        typeof OrderIdParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof OrderDetailSchema, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    };
}>;
//# sourceMappingURL=types.d.ts.map