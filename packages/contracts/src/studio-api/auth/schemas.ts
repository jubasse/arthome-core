import { z } from 'zod';

import { LOCALES, Locale } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { uuidOut, vocabularyIn } from '@arthome/core/schema';

import { sensitive } from '../../http/index.js';
import { StudioSessionModeSchema } from '../../studio-access/index.js';

export const SignInStudioBodySchema: z.ZodObject<
  {
    email: z.ZodString;
    password: z.ZodString;
    mode: typeof StudioSessionModeSchema;
    deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    deviceLabel: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$strip
> = z.object({
  email: z.string().meta({ format: 'email' }),
  password: sensitive(z.string()),
  mode: StudioSessionModeSchema,
  deviceId: uuidOut().nullable().optional(),
  deviceLabel: z.string().nullable().optional(),
});

export const VerifyTwoFactorStudioBodySchema: z.ZodObject<
  {
    challengeId: z.ZodString;
    code: z.ZodString;
    mode: typeof StudioSessionModeSchema;
    deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$strip
> = z.object({
  challengeId: z.string(),
  code: sensitive(z.string()),
  mode: StudioSessionModeSchema,
  deviceId: uuidOut().nullable().optional(),
});

export const RequestPasswordResetStudioBodySchema: z.ZodObject<
  { email: z.ZodString; locale: z.ZodOptional<VocabularyIn<readonly ['fr', 'en']>> },
  z.core.$strip
> = z.object({
  email: z.string().meta({ format: 'email' }),
  locale: vocabularyIn(LOCALES)
    .meta({
      'x-arthome-vocabulary-source': 'LOCALES',
      description:
        '**The domain declares exactly two.** This one is an **input**, so the enum is strict:\na locale we cannot render is refused rather than silently answered in another\nlanguage.\n',
      examples: [Locale.FR],
    })
    .optional(),
});

export type SignInStudioBody = z.output<typeof SignInStudioBodySchema>;
export type VerifyTwoFactorStudioBody = z.output<typeof VerifyTwoFactorStudioBodySchema>;
export type RequestPasswordResetStudioBody = z.output<typeof RequestPasswordResetStudioBodySchema>;
