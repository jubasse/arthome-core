/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */
import type { ApiErrorCode, DomainErrorCode, ModerationErrorCode } from '@arthome/core';
import type { ExpectedVersionQuery, IdentifiedAccess, ItemResponse, JsonRequestBody, Route } from '../../http/index.js';
import type { ModerationItemSchema } from '../../studio-desk/index.js';
import type { IdempotencyKeyParameter, IfRightsVersionParameter, SurfaceParameter, TraceparentParameter, operator, studioConventions } from '../components.js';
import type { ModerationItemIdParameter, SettleModerationItemBodySchema } from './schemas.js';
export type ClaimModerationItemRoute = Route<{
    method: 'post';
    version: 1;
    path: '/moderation/items/{itemId}/claim';
    parameters: readonly [
        typeof ModerationItemIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof IfRightsVersionParameter
    ];
    access: IdentifiedAccess<typeof operator, false>;
    responses: {
        200: ItemResponse<typeof studioConventions, typeof ModerationItemSchema, unknown>;
    };
    errorCodes: {
        403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED | typeof ModerationErrorCode.ALREADY_CLAIMED)[];
    };
}>;
export type ReleaseModerationItemRoute = Route<{
    method: 'delete';
    version: 1;
    path: '/moderation/items/{itemId}/claim';
    parameters: readonly [
        typeof ModerationItemIdParameter,
        typeof IdempotencyKeyParameter,
        ExpectedVersionQuery,
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof IfRightsVersionParameter
    ];
    access: IdentifiedAccess<typeof operator, false>;
    responses: {
        200: ItemResponse<typeof studioConventions, typeof ModerationItemSchema, unknown>;
    };
    errorCodes: {
        403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED | typeof DomainErrorCode.STATE_CONFLICT)[];
    };
}>;
export type SettleModerationItemRoute = Route<{
    method: 'post';
    version: 1;
    path: '/moderation/items/{itemId}/verdict';
    parameters: readonly [
        typeof ModerationItemIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof IfRightsVersionParameter
    ];
    requestBody: JsonRequestBody<typeof SettleModerationItemBodySchema, true>;
    access: IdentifiedAccess<typeof operator, false>;
    responses: {
        200: ItemResponse<typeof studioConventions, typeof ModerationItemSchema, unknown>;
    };
    errorCodes: {
        403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED | typeof ModerationErrorCode.ALREADY_SETTLED)[];
    };
}>;
//# sourceMappingURL=types.d.ts.map