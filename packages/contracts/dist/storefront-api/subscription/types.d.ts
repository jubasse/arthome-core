/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */
import type { ApiErrorCode } from '@arthome/core';
import type { IdentifiedAccess, ItemResponse, JsonRequestBody, Route } from '../../http/index.js';
import type { SubscriptionSchema } from '../../ticketing/index.js';
import type { IdempotencyKeyParameter, SurfaceParameter, TraceparentParameter, storefrontConventions, viewer } from '../components.js';
import type { PaymentHandoffAnswerSchema, SetSubscriptionPlanBodySchema, SubscriptionAnswerSchema } from './schemas.js';
export type SetSubscriptionPlanRoute = Route<{
    method: 'post';
    version: 1;
    path: '/subscription/change-plan';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<typeof SetSubscriptionPlanBodySchema, true>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: {
            readonly description: 'Subscription updated.';
            readonly content: {
                readonly 'application/json': {
                    readonly schema: typeof SubscriptionAnswerSchema;
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
export type CancelSubscriptionRoute = Route<{
    method: 'post';
    version: 1;
    path: '/subscription/cancel';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof SubscriptionSchema, unknown>;
    };
    errorCodes: {
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
//# sourceMappingURL=types.d.ts.map