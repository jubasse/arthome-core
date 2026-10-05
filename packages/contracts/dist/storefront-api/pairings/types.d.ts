/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */
import type { ApiErrorCode, OrderErrorCode, PairingErrorCode } from '@arthome/core';
import type { IdentifiedAccess, ItemResponse, JsonRequestBody, Route } from '../../http/index.js';
import type { DevicePairingSchema, PairingOutcomeSchema } from '../../identity/index.js';
import type { AdmissionTokenParameter, IdempotencyKeyParameter, SurfaceParameter, TraceparentParameter, storefrontConventions, viewer, viewerOrDevice } from '../components.js';
import type { CreatePairingBodySchema, DecidePairingBodySchema, EngagePairingBodySchema, PairingIdParameter } from './schemas.js';
export type CreatePairingRoute = Route<{
    method: 'post';
    version: 1;
    path: '/pairings';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof AdmissionTokenParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<typeof CreatePairingBodySchema, true>;
    access: IdentifiedAccess<typeof viewerOrDevice, false>;
    responses: {
        201: ItemResponse<typeof storefrontConventions, typeof DevicePairingSchema, unknown>;
    };
    errorCodes: {
        403: readonly (typeof OrderErrorCode.SALES_QUEUE_ADMISSION_REQUIRED)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type PollPairingRoute = Route<{
    method: 'get';
    version: 1;
    path: '/pairings/{pairingId}';
    parameters: readonly [
        typeof PairingIdParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewerOrDevice, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof PairingOutcomeSchema, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        410: readonly (typeof ApiErrorCode.CURSOR_TOO_OLD)[];
        429: readonly (typeof PairingErrorCode.SLOW_DOWN)[];
    };
}>;
export type CancelPairingRoute = Route<{
    method: 'delete';
    version: 1;
    path: '/pairings/{pairingId}';
    parameters: readonly [
        typeof PairingIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewerOrDevice, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof PairingOutcomeSchema, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED | typeof PairingErrorCode.EXECUTION_ENGAGED)[];
    };
}>;
export type EngagePairingRoute = Route<{
    method: 'post';
    version: 1;
    path: '/pairings/{pairingId}/engagement';
    parameters: readonly [
        typeof PairingIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<typeof EngagePairingBodySchema, false>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof PairingOutcomeSchema, unknown>;
    };
    errorCodes: {
        403: readonly (typeof PairingErrorCode.IDENTITY_MISMATCH | typeof PairingErrorCode.INTENT_NOT_ENGAGEABLE)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
        410: readonly (typeof ApiErrorCode.CURSOR_TOO_OLD)[];
    };
}>;
export type DecidePairingRoute = Route<{
    method: 'post';
    version: 1;
    path: '/pairings/{pairingId}/decision';
    parameters: readonly [
        typeof PairingIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<typeof DecidePairingBodySchema, true>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof PairingOutcomeSchema, unknown>;
    };
    errorCodes: {
        403: readonly (typeof PairingErrorCode.IDENTITY_MISMATCH)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
        410: readonly (typeof ApiErrorCode.CURSOR_TOO_OLD)[];
    };
}>;
//# sourceMappingURL=types.d.ts.map