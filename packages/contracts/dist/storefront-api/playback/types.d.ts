/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */
import type { ApiErrorCode, IdentityErrorCode } from '@arthome/core';
import type { IdentifiedAccess, ItemResponse, JsonRequestBody, Response, Route } from '../../http/index.js';
import type { PlaybackRenewalSchema, PlaybackTicketSchema } from '../../streaming/index.js';
import type { DateIdParameter, IdempotencyKeyParameter, SurfaceParameter, TraceparentParameter, storefrontConventions, viewer } from '../components.js';
import type { OpenPlaybackBodySchema, PlaybackSessionIdParameter } from './schemas.js';
export type OpenPlaybackRoute = Route<{
    method: 'post';
    version: 1;
    path: '/playback/{dateId}/open';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<typeof OpenPlaybackBodySchema, true>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof PlaybackTicketSchema, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type RenewPlaybackTicketRoute = Route<{
    method: 'post';
    version: 1;
    path: '/playback/sessions/{sessionId}/renew';
    parameters: readonly [
        typeof PlaybackSessionIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof PlaybackRenewalSchema, unknown>;
    };
    errorCodes: {
        403: readonly (typeof IdentityErrorCode.SIGNED_OUT_ELSEWHERE)[];
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type ReleasePlaybackRoute = Route<{
    method: 'post';
    version: 1;
    path: '/playback/sessions/{sessionId}/release';
    parameters: readonly [
        typeof PlaybackSessionIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        204: Response;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
//# sourceMappingURL=types.d.ts.map