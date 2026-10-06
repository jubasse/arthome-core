import { RefundReason } from '@arthome/core';

import type { RefundSeatBody } from './schemas.js';
import { RefundSeatBodySchema, SeatRefundSchema } from './schemas.js';
import type { ModuleExamples } from '../../openapi/docs.js';

const refundSeatBody: RefundSeatBody = { refundReasonCode: RefundReason.GOODWILL };

export const seatsExamples: ModuleExamples = [
  [RefundSeatBodySchema, [refundSeatBody]],
  [
    SeatRefundSchema,
    [
      {
        refunded: { amountMinor: 2400, currencyCode: 'EUR' },
        payoutId: null,
      },
    ],
  ],
];
