import { z } from 'zod';
import { SeatCancelReason } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { DateCardSchema } from '../../catalog/index.js';
import type { PathParameter } from '../../http/index.js';
import { TicketCardSchema } from '../../ticketing/index.js';
declare const VIEWER_SEAT_CANCEL_REASONS: readonly [typeof SeatCancelReason.VIEWER_REQUEST];
export declare const SeatIdParameter: PathParameter<'seatId', z.ZodString>;
export declare const CancelSeatBodySchema: z.ZodObject<{
    cancelReasonCode: z.ZodOptional<VocabularyIn<typeof VIEWER_SEAT_CANCEL_REASONS>>;
}, z.core.$strip>;
export declare const SeatCancellationSchema: z.ZodObject<{
    ticket: z.ZodOptional<typeof TicketCardSchema>;
    date: z.ZodOptional<typeof DateCardSchema>;
}, z.core.$loose>;
export type CancelSeatBody = z.output<typeof CancelSeatBodySchema>;
export type SeatCancellation = z.output<typeof SeatCancellationSchema>;
export {};
//# sourceMappingURL=schemas.d.ts.map