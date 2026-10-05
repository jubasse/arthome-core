import { z } from 'zod';
import { PLAN_TIERS } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { StorefrontEnvelopeMetaSchema } from '../../envelope/index.js';
import { PaymentHandoffSchema, SubscriptionSchema } from '../../ticketing/index.js';
export declare const SetSubscriptionPlanBodySchema: z.ZodObject<{
    planTier: VocabularyIn<typeof PLAN_TIERS>;
    paymentMethodRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const SubscriptionAnswerSchema: z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
    data: typeof SubscriptionSchema;
}, z.core.$loose>>;
export declare const PaymentHandoffAnswerSchema: z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
    data: typeof PaymentHandoffSchema;
}, z.core.$loose>>;
export type SetSubscriptionPlanBody = z.output<typeof SetSubscriptionPlanBodySchema>;
export type SubscriptionAnswer = z.output<typeof SubscriptionAnswerSchema>;
export type PaymentHandoffAnswer = z.output<typeof PaymentHandoffAnswerSchema>;
//# sourceMappingURL=schemas.d.ts.map