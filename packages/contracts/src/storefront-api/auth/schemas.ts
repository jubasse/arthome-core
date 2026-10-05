import { z } from 'zod';

import { LOCALES, Locale } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { InstantOut, uuidOut, vocabularyIn } from '@arthome/core/schema';

import { localVocabulary, sensitive } from '../../http/index.js';
import type { PathParameter } from '../../http/index.js';
import { StorefrontSessionModeSchema } from '../../identity/index.js';

const SOCIAL_PROVIDERS = ['google', 'facebook'] as const;

export const SocialProviderParameter: PathParameter<
  'provider',
  VocabularyIn<typeof SOCIAL_PROVIDERS>
> = {
  name: 'provider',
  in: 'path',
  required: true,
  schema: localVocabulary(
    SOCIAL_PROVIDERS,
    'An external provider or platform identifier. It is their vocabulary, not ours, and it changes when they change.',
  ),
};

export const SignUpBodySchema: z.ZodObject<
  {
    email: z.ZodString;
    password: z.ZodString;
    displayName: z.ZodOptional<z.ZodString>;
    mode: typeof StorefrontSessionModeSchema;
    deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    acceptedTermsVersion: z.ZodInt;
    locale: VocabularyIn<typeof LOCALES>;
  },
  z.core.$strip
> = z.object({
  email: z.string().meta({
    format: 'email',
  }),
  password: z.string().min(12).max(128),
  displayName: z.string().max(80).optional(),
  mode: StorefrontSessionModeSchema,
  deviceId: uuidOut().nullable().optional(),
  acceptedTermsVersion: z.int().meta({ minimum: undefined, maximum: undefined }).meta({
    description:
      '**Timestamped by the server, versioned**: a consent without a version or a date is worth nothing.',
  }),
  locale: vocabularyIn(LOCALES).meta({
    'x-arthome-vocabulary-source': 'LOCALES',
    description:
      "The language the account's emails are written in, starting with the welcome and the\nverification link. **Strict, as an input**: a locale we cannot render is refused\nrather than answered in another language. The country is not asked: the server\nresolves it.\n",
    examples: [Locale.FR],
  }),
});

export const SignInBodySchema: z.ZodObject<
  {
    email: z.ZodString;
    password: z.ZodString;
    mode: typeof StorefrontSessionModeSchema;
    deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$strip
> = z.object({
  email: z.string().meta({
    format: 'email',
  }),
  password: z.string().max(128),
  mode: StorefrontSessionModeSchema,
  deviceId: uuidOut().nullable().optional(),
});

export const SignOutAnswerSchema: z.ZodOptional<
  z.ZodObject<{ signedOut: z.ZodOptional<z.ZodBoolean> }, z.core.$loose>
> = z
  .looseObject({
    signedOut: z.boolean().optional(),
  })
  .optional();

export const ConfirmEmailVerificationBodySchema: z.ZodObject<
  { token: z.ZodString },
  z.core.$strip
> = z.object({
  token: z.string().min(1).max(256),
});

export const EmailVerificationSchema: z.ZodObject<{ verified: z.ZodBoolean }, z.core.$loose> =
  z.looseObject({
    verified: z.boolean(),
  });

export const EmailVerificationQueueingSchema: z.ZodObject<{ queued: z.ZodBoolean }, z.core.$loose> =
  z.looseObject({
    queued: z.boolean(),
  });

export const RequestPasswordResetBodySchema: z.ZodObject<
  { email: z.ZodString; locale: z.ZodOptional<VocabularyIn<typeof LOCALES>> },
  z.core.$strip
> = z.object({
  email: z.string().meta({
    format: 'email',
  }),
  locale: vocabularyIn(LOCALES)
    .meta({
      'x-arthome-vocabulary-source': 'LOCALES',
      description:
        '**The domain declares exactly two.** This one is an **input**, so the enum is strict:\na locale we cannot render is refused rather than silently answered in another\nlanguage.\n',
      examples: [Locale.FR],
    })
    .optional(),
});

export const ResetPasswordBodySchema: z.ZodObject<
  { token: z.ZodString; password: z.ZodString },
  z.core.$strip
> = z.object({
  token: z.string(),
  password: z.string().min(12).max(128),
});

export const PasswordChangeSchema: z.ZodOptional<
  z.ZodObject<
    { changed: z.ZodOptional<z.ZodBoolean>; otherSessionsRevoked: z.ZodOptional<z.ZodInt> },
    z.core.$loose
  >
> = z
  .looseObject({
    changed: z.boolean().optional(),
    otherSessionsRevoked: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
  })
  .optional();

export const StartSocialSignInBodySchema: z.ZodObject<
  {
    mode: typeof StorefrontSessionModeSchema;
    deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    returnPath: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$strip
> = z.object({
  mode: StorefrontSessionModeSchema,
  deviceId: uuidOut().nullable().optional(),
  returnPath: z
    .string()
    .nullable()
    .meta({
      description:
        '**Relative** return path inside the surface. An absolute address is refused: the allowlist\nis made of **literal strings**, never of a pattern.\n',
    })
    .optional(),
});

export const SocialSignInStartSchema: z.ZodObject<
  { authorizationUrl: z.ZodString; state: z.ZodString; expiresAt: z.ZodString },
  z.core.$loose
> = z.looseObject({
  authorizationUrl: z.string().meta({
    format: 'uri',
  }),
  state: z.string().meta({
    description: '**Opaque, single-use, short-lived.** It carries nothing meaningful.',
  }),
  expiresAt: InstantOut,
});

export const ExchangeOneTimeTokenBodySchema: z.ZodObject<
  {
    state: z.ZodString;
    mode: typeof StorefrontSessionModeSchema;
    deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$strip
> = z.object({
  state: z.string(),
  mode: StorefrontSessionModeSchema,
  deviceId: uuidOut().nullable().optional(),
});

export const ChangePasswordBodySchema: z.ZodObject<
  {
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
    revokeOtherSessions: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
  },
  z.core.$strip
> = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(12),
  revokeOtherSessions: z.boolean().default(true).optional(),
});

export const EnableTwoFactorBodySchema: z.ZodObject<{ password: z.ZodString }, z.core.$strip> =
  z.object({
    password: z.string().meta({
      description: 'Re-authentication — this is a sensitive operation.',
    }),
  });

export const TwoFactorEnrolmentSchema: z.ZodObject<
  { otpauthUri: z.ZodString; backupCodes: z.ZodArray<z.ZodString> },
  z.core.$loose
> = z.looseObject({
  otpauthUri: sensitive(z.string()),
  backupCodes: sensitive(z.array(z.string())),
});

export const DisableTwoFactorBodySchema: typeof EnableTwoFactorBodySchema = z.object({
  password: z.string(),
});

export const TwoFactorDisablingSchema: z.ZodOptional<
  z.ZodObject<{ twoFactorEnabled: z.ZodOptional<z.ZodBoolean> }, z.core.$loose>
> = z
  .looseObject({
    twoFactorEnabled: z.boolean().optional(),
  })
  .optional();

export const VerifyTwoFactorBodySchema: z.ZodObject<
  {
    challengeId: z.ZodString;
    code: z.ZodString;
    mode: typeof StorefrontSessionModeSchema;
    deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$strip
> = z.object({
  challengeId: z.string(),
  code: z.string(),
  mode: StorefrontSessionModeSchema,
  deviceId: uuidOut().nullable().optional(),
});

export type SignUpBody = z.output<typeof SignUpBodySchema>;
export type SignInBody = z.output<typeof SignInBodySchema>;
export type SignOutAnswer = z.output<typeof SignOutAnswerSchema>;
export type ConfirmEmailVerificationBody = z.output<typeof ConfirmEmailVerificationBodySchema>;
export type EmailVerification = z.output<typeof EmailVerificationSchema>;
export type EmailVerificationQueueing = z.output<typeof EmailVerificationQueueingSchema>;
export type RequestPasswordResetBody = z.output<typeof RequestPasswordResetBodySchema>;
export type ResetPasswordBody = z.output<typeof ResetPasswordBodySchema>;
export type PasswordChange = z.output<typeof PasswordChangeSchema>;
export type StartSocialSignInBody = z.output<typeof StartSocialSignInBodySchema>;
export type SocialSignInStart = z.output<typeof SocialSignInStartSchema>;
export type ExchangeOneTimeTokenBody = z.output<typeof ExchangeOneTimeTokenBodySchema>;
export type ChangePasswordBody = z.output<typeof ChangePasswordBodySchema>;
export type EnableTwoFactorBody = z.output<typeof EnableTwoFactorBodySchema>;
export type TwoFactorEnrolment = z.output<typeof TwoFactorEnrolmentSchema>;
export type DisableTwoFactorBody = z.output<typeof DisableTwoFactorBodySchema>;
export type TwoFactorDisabling = z.output<typeof TwoFactorDisablingSchema>;
export type VerifyTwoFactorBody = z.output<typeof VerifyTwoFactorBodySchema>;
