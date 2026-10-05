/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */

import type { ApiErrorCode, OrderErrorCode } from '@arthome/core';

import type { IdentifiedAccess, ItemResponse, JsonRequestBody, Route } from '../../http/index.js';
import type {
  IdempotencyKeyParameter,
  SurfaceParameter,
  TraceparentParameter,
  storefrontConventions,
  viewer,
} from '../components.js';
import type { CancelSeatBodySchema, SeatCancellationSchema, SeatIdParameter } from './schemas.js';

export type CancelSeatRoute = Route<{
  method: 'post';
  version: 1;
  path: '/seats/{seatId}/cancel';
  parameters: readonly [
    typeof SeatIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<typeof CancelSeatBodySchema, false>;
  access: IdentifiedAccess<typeof viewer, false>;
  responses: {
    200: ItemResponse<typeof storefrontConventions, typeof SeatCancellationSchema, unknown>;
  };
  errorCodes: {
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT
      | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
      | typeof OrderErrorCode.SEAT_CANCEL_DEADLINE_PASSED
    )[];
  };
}>;
