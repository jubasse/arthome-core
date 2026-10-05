import { z } from 'zod';

import { RefundReason } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { MoneyOut, uuidIn, uuidOut, vocabularyIn } from '@arthome/core/schema';

import type { PathParameter } from '../../http/index.js';

export const SeatIdParameter: PathParameter<'seatId', z.ZodString> = {
  name: 'seatId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

const OPERATOR_REFUND_REASONS: readonly [
  typeof RefundReason.DATE_CANCELLED,
  typeof RefundReason.GOODWILL,
  typeof RefundReason.DUPLICATE,
  typeof RefundReason.DISPUTE,
] = [
  RefundReason.DATE_CANCELLED,
  RefundReason.GOODWILL,
  RefundReason.DUPLICATE,
  RefundReason.DISPUTE,
];

export const RefundSeatBodySchema: z.ZodObject<
  {
    refundReasonCode: VocabularyIn<typeof OPERATOR_REFUND_REASONS>;
    partialAmountMinor: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
  },
  z.core.$strip
> = z.object({
  refundReasonCode: vocabularyIn(OPERATOR_REFUND_REASONS).meta({
    'x-arthome-vocabulary-source': 'REFUND_REASONS',
    'x-arthome-vocabulary-narrowing':
      "The four an operator may choose. The others are raised by the system: a viewer's own cancellation, an account's deletion, and a payment confirmed after its hold expired with no seat left (D-082).",
  }),
  partialAmountMinor: z.int().min(1).meta({ maximum: undefined }).nullable().optional(),
});

export const SeatRefundSchema: z.ZodOptional<
  z.ZodObject<
    {
      refunded: z.ZodOptional<typeof MoneyOut>;
      commissionRefunded: z.ZodOptional<typeof MoneyOut>;
      payoutId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    },
    z.core.$loose
  >
> = z
  .looseObject({
    refunded: MoneyOut.meta({ 'x-arthome-tax-basis': 'inherited' }).optional(),
    commissionRefunded: MoneyOut.meta({ 'x-arthome-tax-basis': 'inherited' }).optional(),
    payoutId: uuidOut().nullable().optional(),
  })
  .optional();

export type RefundSeatBody = z.output<typeof RefundSeatBodySchema>;
export type SeatRefund = z.output<typeof SeatRefundSchema>;
