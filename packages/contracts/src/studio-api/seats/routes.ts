import { ApiErrorCode, DomainErrorCode, OrderErrorCode } from '@arthome/core';

import { RefundSeatBodySchema, SeatIdParameter, SeatRefundSchema } from './schemas.js';
import type { RefundSeatRoute } from './types.js';
import {
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  operator,
  studioV1,
} from '../components.js';

const seats = studioV1
  .identity(operator)
  .headers(SurfaceParameter, TraceparentParameter)
  .errors([ApiErrorCode.FORBIDDEN, ApiErrorCode.NOT_FOUND])
  .tags(StudioTag.TICKETING)
  .resource('seats', { id: SeatIdParameter });

export const refundSeat: RefundSeatRoute = seats.action('refund', {
  operationId: 'refundSeat',
  summary: 'Refunds a seat from the studio.',
  body: RefundSeatBodySchema,
  response: SeatRefundSchema,
  answer: 'Refund recorded, with its effect on the payout.',
  errors: [
    DomainErrorCode.STATE_CONFLICT,
    OrderErrorCode.SEAT_NOT_ACTIVE,
    OrderErrorCode.REFUND_AMOUNT_EXCEEDS_REMAINING,
  ],
});
