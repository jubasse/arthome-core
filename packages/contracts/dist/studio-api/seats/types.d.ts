/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */
import type { ApiErrorCode, DomainErrorCode, OrderErrorCode } from '@arthome/core';
import type { IdentifiedAccess, ItemResponse, JsonRequestBody, Route } from '../../http/index.js';
import type { IdempotencyKeyParameter, IfRightsVersionParameter, SurfaceParameter, TraceparentParameter, operator, studioConventions } from '../components.js';
import type { RefundSeatBodySchema, SeatIdParameter, SeatRefundSchema } from './schemas.js';
export type RefundSeatRoute = Route<{
    method: 'post';
    version: 1;
    path: '/seats/{seatId}/refund';
    parameters: readonly [
        typeof SeatIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof IfRightsVersionParameter
    ];
    requestBody: JsonRequestBody<typeof RefundSeatBodySchema, true>;
    access: IdentifiedAccess<typeof operator, false>;
    responses: {
        200: ItemResponse<typeof studioConventions, typeof SeatRefundSchema, unknown>;
    };
    errorCodes: {
        403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED | typeof OrderErrorCode.REFUND_AMOUNT_EXCEEDS_REMAINING | typeof DomainErrorCode.STATE_CONFLICT)[];
    };
}>;
//# sourceMappingURL=types.d.ts.map