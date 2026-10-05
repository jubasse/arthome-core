import { z } from 'zod';
import type { VocabularyIn } from '@arthome/core/schema';
import { StudioEnvelopeMetaSchema } from '../../envelope/index.js';
import type { Period, PathParameter } from '../../http/index.js';
import { DutySchema } from '../../studio-access/index.js';
import { LocaleInputSchema } from '../auth/schemas.js';
declare const REAUTH_INTENTS: readonly ["reveal_stream_key", "rotate_stream_key", "transfer_ownership", "delete_channel", "change_bank_details"];
declare const REAUTH_FACTORS: readonly ["platform_biometric", "password", "totp", "backup_code"];
declare const PUSH_PLATFORMS: readonly ["fcm", "apns"];
export declare const DeviceIdParameter: PathParameter<'deviceId', z.ZodString>;
export declare const DutiesPeriod: Period;
export declare const CreateReauthTokenBodySchema: z.ZodObject<{
    intent: VocabularyIn<typeof REAUTH_INTENTS>;
    factor: VocabularyIn<typeof REAUTH_FACTORS>;
    proof: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const ReauthTokenSchema: z.ZodObject<{
    reauthToken: z.ZodString;
    intent: z.ZodString;
    expiresAt: z.ZodString;
}, z.core.$loose>;
export declare const ReauthFactorsSchema: z.ZodObject<{
    acceptedFactors: z.ZodOptional<z.ZodArray<z.ZodString>>;
    platformBiometricEnrolled: z.ZodOptional<z.ZodBoolean>;
}, z.core.$loose>;
export declare const StudioDeviceSchema: z.ZodObject<{
    deviceId: z.ZodString;
    label: z.ZodString;
    platform: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    lastSeenAt: z.ZodString;
    isCurrent: z.ZodBoolean;
}, z.core.$loose>;
export declare const StudioDeviceListSchema: z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
    items: z.ZodArray<typeof StudioDeviceSchema>;
}, z.core.$loose>>;
export declare const StudioDeviceRevocationSchema: z.ZodOptional<z.ZodObject<{
    revoked: z.ZodOptional<z.ZodBoolean>;
    commandsStopWithinSec: z.ZodOptional<z.ZodInt>;
}, z.core.$loose>>;
export declare const StudioSessionClosureSchema: z.ZodOptional<z.ZodObject<{
    signedOut: z.ZodOptional<z.ZodBoolean>;
}, z.core.$loose>>;
export declare const RegisterStudioPushTokenBodySchema: z.ZodObject<{
    platform: VocabularyIn<typeof PUSH_PLATFORMS>;
    token: z.ZodString;
    deviceId: z.ZodString;
    locale: z.ZodOptional<typeof LocaleInputSchema>;
}, z.core.$strip>;
export declare const PushRegistrationSchema: z.ZodObject<{
    registered: z.ZodOptional<z.ZodBoolean>;
}, z.core.$loose>;
export declare const UpdateStudioPreferencesBodySchema: z.ZodObject<{
    readingTimezone: z.ZodOptional<z.ZodString>;
    runDeskLayout: z.ZodOptional<z.ZodString>;
    encodingProfileName: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const StudioPreferencesSchema: z.ZodObject<{
    readingTimezone: z.ZodOptional<z.ZodString>;
    runDeskLayout: z.ZodOptional<z.ZodString>;
    encodingProfileName: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
export declare const DutyListSchema: z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
    items: z.ZodArray<typeof DutySchema>;
}, z.core.$loose>>;
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
export {};
//# sourceMappingURL=schemas.d.ts.map