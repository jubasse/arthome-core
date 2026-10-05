import { z } from 'zod';

import type { VocabularyIn } from '@arthome/core/schema';
import { uuidIn } from '@arthome/core/schema';

import { DateCardSchema } from '../../catalog/index.js';
import type { PathParameter } from '../../http/index.js';
import { localVocabulary } from '../../http/index.js';
import { TicketCardSchema } from '../../ticketing/index.js';

const CANCEL_SEAT_CANCEL_REASON_CODE = ['viewer_request'] as const;

export const SeatIdParameter: PathParameter<'seatId', z.ZodString> = {
  name: 'seatId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

export const CancelSeatBodySchema: z.ZodObject<
  { cancelReasonCode: z.ZodOptional<VocabularyIn<typeof CANCEL_SEAT_CANCEL_REASON_CODE>> },
  z.core.$strip
> = z.object({
  cancelReasonCode: localVocabulary(
    CANCEL_SEAT_CANCEL_REASON_CODE,
    'A single-member enum: it records the actor on an audit line, and this path has exactly one actor. Flagged in the description as a question, not settled as a vocabulary.',
  )
    .meta({
      description:
        '**One member, and that is a question rather than a vocabulary.** A field whose\nenum has a single value carries no information: every request that reaches this\npath says the same thing. It is here because the audit line must record *who*\nasked — and a viewer cancelling their own seat is the only actor this path has.\n\n**What would make it a vocabulary is a second actor**, and there is one in the\ndomain already: the studio cancels seats too, through `refundSeat`, with its own\nfour-member `refundReasonCode`. If those two paths ever merge, this field becomes\nthe merged reason and the single member becomes the first of several. Until then\nit is a placeholder that is honest about being one.\n',
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
