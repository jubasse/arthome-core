/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */
import type { ApiErrorCode, IdentityErrorCode, WatchDenialReason } from '@arthome/core';
import type { IdentifiedAccess, ItemResponse, JsonRequestBody, Response, Route, ViewerCountryParameter, service, serviceConventions } from '../../http/index.js';
import type { ActorSurfaceParameter, DeadlineParameter, RelayedTraceparentParameter } from '../../http/service.js';
import type { DateIdParameter, SurfaceParameter } from '../../storefront-api/components.js';
import type { OpenPlaybackBodySchema, PlaybackSessionIdParameter } from '../../storefront-api/playback/schemas.js';
import type { PlaybackRenewalSchema, PlaybackTicketSchema } from '../../streaming/index.js';
export type OpenPlaybackRoute = Route<{
    method: 'post';
    version: 1;
    path: '/playback/{dateId}/open';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof ViewerCountryParameter,
        typeof DeadlineParameter,
        typeof RelayedTraceparentParameter,
        typeof ActorSurfaceParameter
    ];
    requestBody: JsonRequestBody<typeof OpenPlaybackBodySchema, true>;
    access: IdentifiedAccess<typeof service, false>;
    responses: {
        200: ItemResponse<typeof serviceConventions, typeof PlaybackTicketSchema, unknown>;
    };
    errorCodes: {
        403: readonly (typeof WatchDenialReason.CONCURRENT_LIMIT_REACHED | typeof WatchDenialReason.DATE_CANCELLED | typeof WatchDenialReason.DATE_INTERRUPTED | typeof WatchDenialReason.LIVE_ENDED | typeof WatchDenialReason.NO_REPLAY | typeof WatchDenialReason.NO_SEAT | typeof WatchDenialReason.NOT_PUBLISHED | typeof WatchDenialReason.OUT_OF_TERRITORY | typeof WatchDenialReason.PREVIEW_EXHAUSTED | typeof WatchDenialReason.REPLAY_NOT_ON_SALE | typeof WatchDenialReason.ROOM_NOT_OPEN | typeof WatchDenialReason.SEAT_EXPIRED | typeof WatchDenialReason.SUBSCRIPTION_REQUIRED)[];
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        410: readonly (typeof WatchDenialReason.REPLAY_EXPIRED)[];
    };
}>;
export type RenewPlaybackTicketRoute = Route<{
    method: 'post';
    version: 1;
    path: '/playback/sessions/{sessionId}/renew';
    parameters: readonly [
        typeof PlaybackSessionIdParameter,
        typeof ViewerCountryParameter,
        typeof DeadlineParameter,
        typeof RelayedTraceparentParameter,
        typeof ActorSurfaceParameter
    ];
    access: IdentifiedAccess<typeof service, false>;
    responses: {
        200: ItemResponse<typeof serviceConventions, typeof PlaybackRenewalSchema, unknown>;
    };
    errorCodes: {
        403: readonly (typeof IdentityErrorCode.SIGNED_OUT_ELSEWHERE | typeof WatchDenialReason.CONCURRENT_LIMIT_REACHED | typeof WatchDenialReason.PREVIEW_EXHAUSTED)[];
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    };
}>;
export type ReleasePlaybackRoute = Route<{
    method: 'post';
    version: 1;
    path: '/playback/sessions/{sessionId}/release';
    parameters: readonly [
        typeof PlaybackSessionIdParameter,
        typeof DeadlineParameter,
        typeof RelayedTraceparentParameter,
        typeof ActorSurfaceParameter
    ];
    access: IdentifiedAccess<typeof service, false>;
    responses: {
        204: Response;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    };
}>;
//# sourceMappingURL=types.d.ts.map