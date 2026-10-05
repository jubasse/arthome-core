/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */
import type { ApiErrorCode, ChannelErrorCode } from '@arthome/core';
import type { IdentifiedAccess, ItemResponse, JsonRequestBody, Route } from '../../http/index.js';
import type { BankChangeRequestSchema } from '../../studio-money/index.js';
import type { IdempotencyKeyParameter, IfRightsVersionParameter, SurfaceParameter, TraceparentParameter, operator, studioConventions } from '../components.js';
import type { BankChangeRequestIdParameter, CountersignBankChangeBodySchema } from './schemas.js';
export type CountersignBankChangeRoute = Route<{
    method: 'post';
    version: 1;
    path: '/bank-change-requests/{requestId}/countersign';
    parameters: readonly [
        typeof BankChangeRequestIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof IfRightsVersionParameter
    ];
    requestBody: JsonRequestBody<typeof CountersignBankChangeBodySchema, true>;
    access: IdentifiedAccess<typeof operator, false>;
    responses: {
        200: ItemResponse<typeof studioConventions, typeof BankChangeRequestSchema, unknown>;
    };
    errorCodes: {
        403: readonly (typeof ApiErrorCode.FORBIDDEN | typeof ChannelErrorCode.SAME_ACTOR_FORBIDDEN)[];
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
//# sourceMappingURL=types.d.ts.map