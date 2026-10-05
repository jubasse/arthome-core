import { z } from 'zod';
import { RefundReason } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { MoneyOut } from '@arthome/core/schema';
import type { PathParameter } from '../../http/index.js';
export declare const SeatIdParameter: PathParameter<'seatId', z.ZodString>;
declare const OPERATOR_REFUND_REASONS: readonly [
    typeof RefundReason.DATE_CANCELLED,
    typeof RefundReason.GOODWILL,
    typeof RefundReason.DUPLICATE,
    typeof RefundReason.DISPUTE
];
export declare const RefundSeatBodySchema: z.ZodObject<{
    refundReasonCode: VocabularyIn<typeof OPERATOR_REFUND_REASONS>;
    partialAmountMinor: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
}, z.core.$strip>;
export declare const SeatRefundSchema: z.ZodOptional<z.ZodObject<{
    refunded: z.ZodOptional<typeof MoneyOut>;
    commissionRefunded: z.ZodOptional<typeof MoneyOut>;
    payoutId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$loose>>;
export type RefundSeatBody = z.output<typeof RefundSeatBodySchema>;
export type SeatRefund = z.output<typeof SeatRefundSchema>;
export {};
//# sourceMappingURL=schemas.d.ts.map