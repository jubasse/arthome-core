import { z } from 'zod';

import { PLAN_TIERS } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { vocabularyIn } from '@arthome/core/schema';

import { StorefrontEnvelopeMetaSchema } from '../../envelope/index.js';
import { PaymentHandoffSchema, SubscriptionSchema } from '../../ticketing/index.js';

export const SetSubscriptionPlanBodySchema: z.ZodObject<
  {
    planTier: VocabularyIn<typeof PLAN_TIERS>;
    paymentMethodRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$strip
> = z.object({
  planTier: vocabularyIn(PLAN_TIERS).meta({
    'x-arthome-vocabulary-source': 'PLAN_TIERS',
  }),
  paymentMethodRef: z.string().nullable().optional(),
});

export const SubscriptionAnswerSchema: z.ZodIntersection<
  typeof StorefrontEnvelopeMetaSchema,
  z.ZodObject<{ data: typeof SubscriptionSchema }, z.core.$loose>
> = z.intersection(StorefrontEnvelopeMetaSchema, z.looseObject({ data: SubscriptionSchema }));

export const PaymentHandoffAnswerSchema: z.ZodIntersection<
  typeof StorefrontEnvelopeMetaSchema,
  z.ZodObject<{ data: typeof PaymentHandoffSchema }, z.core.$loose>
> = z.intersection(StorefrontEnvelopeMetaSchema, z.looseObject({ data: PaymentHandoffSchema }));

export type SetSubscriptionPlanBody = z.output<typeof SetSubscriptionPlanBodySchema>;
export type SubscriptionAnswer = z.output<typeof SubscriptionAnswerSchema>;
export type PaymentHandoffAnswer = z.output<typeof PaymentHandoffAnswerSchema>;
