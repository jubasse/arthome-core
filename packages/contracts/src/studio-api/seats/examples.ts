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
        commissionRefunded: { amountMinor: 273, currencyCode: 'EUR' },
        payoutId: '019928e5-0000-7000-8000-000000000001',
      },
    ],
  ],
];
