import { z } from 'zod';

import { SeatCancelReason } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { uuidIn, vocabularyIn } from '@arthome/core/schema';

import { DateCardSchema } from '../../catalog/index.js';
import type { PathParameter } from '../../http/index.js';
import { TicketCardSchema } from '../../ticketing/index.js';

const VIEWER_SEAT_CANCEL_REASONS: readonly [typeof SeatCancelReason.VIEWER_REQUEST] = [
  SeatCancelReason.VIEWER_REQUEST,
];

export const SeatIdParameter: PathParameter<'seatId', z.ZodString> = {
  name: 'seatId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

export const CancelSeatBodySchema: z.ZodObject<
  { cancelReasonCode: z.ZodOptional<VocabularyIn<typeof VIEWER_SEAT_CANCEL_REASONS>> },
  z.core.$strip
> = z.object({
  cancelReasonCode: vocabularyIn(VIEWER_SEAT_CANCEL_REASONS)
    .meta({
      'x-arthome-vocabulary-source': 'SEAT_CANCEL_REASONS',
      'x-arthome-vocabulary-narrowing':
        'The one a viewer gives. The others are raised by the system: a cancelled date and a deleted account.',
    })
    .optional(),
});

export const SeatCancellationSchema: z.ZodObject<
  { ticket: z.ZodOptional<typeof TicketCardSchema>; date: z.ZodOptional<typeof DateCardSchema> },
  z.core.$loose
> = z.looseObject({
  ticket: TicketCardSchema.optional(),
  date: DateCardSchema.optional(),
});

export type CancelSeatBody = z.output<typeof CancelSeatBodySchema>;
export type SeatCancellation = z.output<typeof SeatCancellationSchema>;
