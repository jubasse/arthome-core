import { z } from 'zod';

import type { VocabularyIn } from '@arthome/core/schema';
import { uuidIn, uuidOut } from '@arthome/core/schema';

import type { PathParameter } from '../../http/index.js';
import { localVocabulary } from '../../http/index.js';

const SUPPORT_TOPICS = [
  'ticketing_refund',
  'playback_quality',
  'replay',
  'store_shipping',
  'account_signin',
  'personal_data',
] as const;

export const ContactSupportBodySchema: z.ZodObject<
  {
    topic: VocabularyIn<typeof SUPPORT_TOPICS>;
    message: z.ZodString;
    context: z.ZodOptional<
      z.ZodObject<
        {
          dateId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          seatId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          orderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          traceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
> = z.object({
  topic: localVocabulary(
    SUPPORT_TOPICS,
    'An account-management shape, local to this endpoint: what the person asked for, not a fact the domain reasons about.',
  ),
  message: z.string().min(10).max(4000),
  context: z
    .object({
      dateId: uuidOut().nullable().optional(),
      seatId: uuidOut().nullable().optional(),
      orderId: uuidOut().nullable().optional(),
      traceId: z.string().nullable().optional(),
    })
    .optional(),
});

export const SupportRequestOpeningSchema: z.ZodOptional<
  z.ZodObject<
    {
      requestId: z.ZodOptional<z.ZodString>;
      reference: z.ZodOptional<z.ZodString>;
      priorityCode: z.ZodOptional<z.ZodString>;
    },
    z.core.$loose
  >
> = z
  .looseObject({
    requestId: uuidOut().optional(),
    reference: z.string().optional(),
    priorityCode: z.string().optional(),
  })
  .optional();

export const SupportRequestIdParameter: PathParameter<'requestId', z.ZodString> = {
  name: 'requestId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

export type ContactSupportBody = z.output<typeof ContactSupportBodySchema>;
export type SupportRequestOpening = z.output<typeof SupportRequestOpeningSchema>;
