import { z } from 'zod';

import type { VocabularyIn } from '@arthome/core/schema';
import { InstantOut, uuidIn, uuidOut, vocabularyOutLocal } from '@arthome/core/schema';

import { StudioEnvelopeMetaSchema } from '../../envelope/index.js';
import type { Period, PathParameter } from '../../http/index.js';
import { localVocabulary, period, sensitive } from '../../http/index.js';
import { DutySchema } from '../../studio-access/index.js';
import { LocaleInputSchema } from '../auth/schemas.js';

const REAUTH_INTENTS = [
  'reveal_stream_key',
  'rotate_stream_key',
  'transfer_ownership',
  'delete_channel',
  'change_bank_details',
] as const;
const REAUTH_FACTORS = ['platform_biometric', 'password', 'totp', 'backup_code'] as const;
const REAUTH_FACTOR_REASON =
  'An account-management shape, local to this endpoint: what the person asked for, not a fact the domain reasons about.';
const DEVICE_PLATFORMS = ['ios', 'android', 'web'] as const;
const PUSH_PLATFORMS = ['fcm', 'apns'] as const;
const PROVIDER_PLATFORM_REASON =
  'An external provider or platform identifier. It is their vocabulary, not ours, and it changes when they change.';

export const DeviceIdParameter: PathParameter<'deviceId', z.ZodString> = {
  name: 'deviceId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

export const DutiesPeriod: Period = period({ type: 'dateTime' });

export const CreateReauthTokenBodySchema: z.ZodObject<
  {
    intent: VocabularyIn<typeof REAUTH_INTENTS>;
    factor: VocabularyIn<typeof REAUTH_FACTORS>;
    proof: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$strip
> = z.object({
  intent: localVocabulary(
    REAUTH_INTENTS,
    'A vocabulary local to this contract. The domain neither produces nor consumes these values — they describe what this endpoint offers, and a new member is an endpoint change.',
  ).meta({ description: 'The command targeted. The token is valid for that one only.' }),
  factor: localVocabulary(REAUTH_FACTORS, REAUTH_FACTOR_REASON),
  proof: sensitive(z.string())
    .nullable()
    .meta({
      description:
        'Proof of the factor. **Absent for `platform_biometric`**: the device attests, the secret never\nleaves the hardware.\n',
    })
    .optional(),
});

export const ReauthTokenSchema: z.ZodObject<
  { reauthToken: z.ZodString; intent: z.ZodString; expiresAt: z.ZodString },
  z.core.$loose
> = z.looseObject({
  reauthToken: sensitive(z.string()),
  intent: z.string(),
  expiresAt: InstantOut,
});

export const ReauthFactorsSchema: z.ZodObject<
  {
    acceptedFactors: z.ZodOptional<z.ZodArray<z.ZodString>>;
    platformBiometricEnrolled: z.ZodOptional<z.ZodBoolean>;
  },
  z.core.$loose
> = z.looseObject({
  acceptedFactors: z.array(vocabularyOutLocal(REAUTH_FACTORS, REAUTH_FACTOR_REASON)).optional(),
  platformBiometricEnrolled: z.boolean().optional(),
});

export const StudioDeviceSchema: z.ZodObject<
  {
    deviceId: z.ZodString;
    label: z.ZodString;
    platform: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    lastSeenAt: z.ZodString;
    isCurrent: z.ZodBoolean;
  },
  z.core.$loose
> = z.looseObject({
  deviceId: uuidOut(),
  label: z.string(),
  platform: vocabularyOutLocal(DEVICE_PLATFORMS, PROVIDER_PLATFORM_REASON).optional(),
  city: z.string().nullable().optional(),
  lastSeenAt: InstantOut,
  isCurrent: z.boolean(),
});

export const StudioDeviceListSchema: z.ZodIntersection<
  typeof StudioEnvelopeMetaSchema,
  z.ZodObject<{ items: z.ZodArray<typeof StudioDeviceSchema> }, z.core.$loose>
> = z.intersection(StudioEnvelopeMetaSchema, z.looseObject({ items: z.array(StudioDeviceSchema) }));

export const StudioDeviceRevocationSchema: z.ZodOptional<
  z.ZodObject<
    { revoked: z.ZodOptional<z.ZodBoolean>; commandsStopWithinSec: z.ZodOptional<z.ZodInt> },
    z.core.$loose
  >
> = z
  .looseObject({
    revoked: z.boolean().optional(),
    commandsStopWithinSec: z
      .int()
      .meta({ minimum: undefined, maximum: undefined })
      .meta({ examples: [60] })
      .optional(),
  })
  .optional();

export const StudioSessionClosureSchema: z.ZodOptional<
  z.ZodObject<{ signedOut: z.ZodOptional<z.ZodBoolean> }, z.core.$loose>
> = z.looseObject({ signedOut: z.boolean().optional() }).optional();

export const RegisterStudioPushTokenBodySchema: z.ZodObject<
  {
    platform: VocabularyIn<typeof PUSH_PLATFORMS>;
    token: z.ZodString;
    deviceId: z.ZodString;
    locale: z.ZodOptional<typeof LocaleInputSchema>;
  },
  z.core.$strip
> = z.object({
  platform: localVocabulary(PUSH_PLATFORMS, PROVIDER_PLATFORM_REASON),
  token: sensitive(z.string()),
  deviceId: uuidOut(),
  locale: LocaleInputSchema.optional(),
});

export const PushRegistrationSchema: z.ZodObject<
  { registered: z.ZodOptional<z.ZodBoolean> },
  z.core.$loose
> = z.looseObject({ registered: z.boolean().optional() });

export const UpdateStudioPreferencesBodySchema: z.ZodObject<
  {
    readingTimezone: z.ZodOptional<z.ZodString>;
    runDeskLayout: z.ZodOptional<z.ZodString>;
    encodingProfileName: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
> = z.object({
  readingTimezone: z.string().optional(),
  runDeskLayout: z.string().optional(),
  encodingProfileName: z.string().optional(),
});

export const StudioPreferencesSchema: z.ZodObject<
  {
    readingTimezone: z.ZodOptional<z.ZodString>;
    runDeskLayout: z.ZodOptional<z.ZodString>;
    encodingProfileName: z.ZodOptional<z.ZodString>;
  },
  z.core.$loose
> = z.looseObject({
  readingTimezone: z.string().optional(),
  runDeskLayout: z.string().optional(),
  encodingProfileName: z.string().optional(),
});

export const DutyListSchema: z.ZodIntersection<
  typeof StudioEnvelopeMetaSchema,
  z.ZodObject<{ items: z.ZodArray<typeof DutySchema> }, z.core.$loose>
> = z.intersection(StudioEnvelopeMetaSchema, z.looseObject({ items: z.array(DutySchema) }));

export type CreateReauthTokenBody = z.output<typeof CreateReauthTokenBodySchema>;
export type ReauthToken = z.output<typeof ReauthTokenSchema>;
export type ReauthFactors = z.output<typeof ReauthFactorsSchema>;
export type StudioDevice = z.output<typeof StudioDeviceSchema>;
export type StudioDeviceList = z.output<typeof StudioDeviceListSchema>;
export type StudioDeviceRevocation = z.output<typeof StudioDeviceRevocationSchema>;
export type StudioSessionClosure = z.output<typeof StudioSessionClosureSchema>;
export type RegisterStudioPushTokenBody = z.output<typeof RegisterStudioPushTokenBodySchema>;
export type PushRegistration = z.output<typeof PushRegistrationSchema>;
export type UpdateStudioPreferencesBody = z.output<typeof UpdateStudioPreferencesBodySchema>;
export type StudioPreferences = z.output<typeof StudioPreferencesSchema>;
export type DutyList = z.output<typeof DutyListSchema>;
