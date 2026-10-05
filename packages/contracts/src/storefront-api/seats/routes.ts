import { ApiErrorCode } from '@arthome/core';

import { CancelSeatBodySchema, SeatCancellationSchema, SeatIdParameter } from './schemas.js';
import type { CancelSeatRoute } from './types.js';
import {
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  storefrontV1,
  viewer,
} from '../components.js';

const seats = storefrontV1
  .identity(viewer)
  .tags(StorefrontTag.COMMERCE)
  .headers(SurfaceParameter, TraceparentParameter)
  .resource('seats', { id: SeatIdParameter, owner: 'caller' });

export const cancelSeat: CancelSeatRoute = seats.action('cancel', {
  operationId: 'cancelSeat',
  summary: 'Cancels a seat before its deadline.',
  'x-arthome-invalidates': ['account:tickets', 'date:{dateId}:availability'],
  body: CancelSeatBodySchema,
  optionalBody: true,
  response: SeatCancellationSchema,
  answer: 'Seat cancelled, with the refund and its delay code.',
  errors: [ApiErrorCode.NOT_FOUND],
});
