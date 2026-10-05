import { z } from 'zod';

import { PRICE_TIERS } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { int64, MoneyOut, uuidOut, vocabularyIn } from '@arthome/core/schema';

import { DateCardSchema, PriceTierSchema } from '../../catalog/index.js';
import type { QueryParameter } from '../../http/index.js';
import { localVocabulary } from '../../http/index.js';

export const DateAvailabilitySchema: z.ZodObject<
  {
    seatsAvailable: z.ZodOptional<z.ZodInt>;
    waitlistCount: z.ZodOptional<z.ZodInt>;
    fillRateBps: z.ZodOptional<z.ZodInt>;
    soldOut: z.ZodOptional<z.ZodBoolean>;
    priceTiers: z.ZodOptional<z.ZodArray<typeof PriceTierSchema>>;
    serviceFeePerSeat: z.ZodOptional<typeof MoneyOut>;
  },
  z.core.$loose
> = z.looseObject({
  seatsAvailable: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
  waitlistCount: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
  fillRateBps: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
  soldOut: z.boolean().optional(),
  priceTiers: z.array(PriceTierSchema).optional(),
  serviceFeePerSeat: MoneyOut.meta({
    'x-arthome-tax-basis': 'inclusive',
  }).optional(),
});

export const QuoteSeatBodySchema: z.ZodObject<
  {
    tier: VocabularyIn<typeof PRICE_TIERS>;
    quantity: z.ZodInt;
    contributionMinor: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    applyCreditId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$strip
> = z.object({
  tier: vocabularyIn(PRICE_TIERS).meta({
    'x-arthome-vocabulary-source': 'PRICE_TIERS',
  }),
  quantity: z.int().min(1).max(10),
  contributionMinor: z
    .int()
    .meta({ minimum: undefined, maximum: undefined })
    .nullable()
    .meta({
      description:
        'Free contribution to the company, for a free seat. The amount is **open**; minimum and\nmaximum are **domain rules**, not attributes of an input field, and the refusal carries\n**`order.contribution_out_of_range`**, with both bounds as parameters.\n',
    })
    .optional(),
  applyCreditId: uuidOut().nullable().optional(),
});

export const WaitlistRegistrationSchema: z.ZodObject<
  {
    joined: z.ZodBoolean;
    rankDisclosed: z.ZodBoolean;
    rank: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    priorityWindowHours: z.ZodOptional<z.ZodInt>;
    date: z.ZodOptional<typeof DateCardSchema>;
  },
  z.core.$loose
> = z.looseObject({
  joined: z.boolean(),
  rankDisclosed: z.boolean(),
  rank: z.int().meta({ minimum: undefined, maximum: undefined }).nullable().optional(),
  priorityWindowHours: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
  date: DateCardSchema.optional(),
});

export const WaitlistDepartureSchema: z.ZodOptional<
  z.ZodObject<{ joined: z.ZodOptional<z.ZodBoolean> }, z.core.$loose>
> = z
  .looseObject({
    joined: z.boolean().optional(),
  })
  .optional();

export type DateAvailability = z.output<typeof DateAvailabilitySchema>;
export type QuoteSeatBody = z.output<typeof QuoteSeatBodySchema>;
export type WaitlistRegistration = z.output<typeof WaitlistRegistrationSchema>;
export type WaitlistDeparture = z.output<typeof WaitlistDepartureSchema>;

const SEND_REACTION_REACTION_ID = ['applause', 'heart', 'bravo', 'laugh', 'wow', 'sad'] as const;

export const SinceSeqParameter: QueryParameter<'sinceSeq', z.ZodNumber> = {
  name: 'sinceSeq',
  in: 'query',
  description: 'Resume by sequence number, after a channel break.',
  schema: int64(),
};

export const SendChatMessageBodySchema: z.ZodObject<
  { text: z.ZodString; atMediaSec: z.ZodInt },
  z.core.$strip
> = z.object({
  text: z.string().min(1).max(500),
  atMediaSec: z.int().min(0).meta({ maximum: undefined }),
});

export const SendReactionBodySchema: z.ZodObject<
  { reactionId: VocabularyIn<typeof SEND_REACTION_REACTION_ID>; atMediaSec: z.ZodInt },
  z.core.$strip
> = z.object({
  reactionId: localVocabulary(
    SEND_REACTION_REACTION_ID,
    'A vocabulary local to this contract. The domain neither produces nor consumes these values — they describe what this endpoint offers, and a new member is an endpoint change.',
  ),
  atMediaSec: z.int().min(0).meta({ maximum: undefined }),
});

export type SendChatMessageBody = z.output<typeof SendChatMessageBodySchema>;
export type SendReactionBody = z.output<typeof SendReactionBodySchema>;
