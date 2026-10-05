import { z } from 'zod';
import { LOCALES } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import type { PathParameter } from '../../http/index.js';
import { StorefrontSessionModeSchema } from '../../identity/index.js';
declare const SOCIAL_PROVIDERS: readonly ["google", "facebook"];
export declare const SocialProviderParameter: PathParameter<'provider', VocabularyIn<typeof SOCIAL_PROVIDERS>>;
export declare const SignUpBodySchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    displayName: z.ZodOptional<z.ZodString>;
    mode: typeof StorefrontSessionModeSchema;
    deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    acceptedTermsVersion: z.ZodInt;
    locale: VocabularyIn<typeof LOCALES>;
}, z.core.$strip>;
export declare const SignInBodySchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    mode: typeof StorefrontSessionModeSchema;
    deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const SignOutAnswerSchema: z.ZodOptional<z.ZodObject<{
    signedOut: z.ZodOptional<z.ZodBoolean>;
}, z.core.$loose>>;
export declare const ConfirmEmailVerificationBodySchema: z.ZodObject<{
    token: z.ZodString;
}, z.core.$strip>;
export declare const EmailVerificationSchema: z.ZodObject<{
    verified: z.ZodBoolean;
}, z.core.$loose>;
export declare const EmailVerificationQueueingSchema: z.ZodObject<{
    queued: z.ZodBoolean;
}, z.core.$loose>;
export declare const RequestPasswordResetBodySchema: z.ZodObject<{
    email: z.ZodString;
    locale: z.ZodOptional<VocabularyIn<typeof LOCALES>>;
}, z.core.$strip>;
export declare const ResetPasswordBodySchema: z.ZodObject<{
    token: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const PasswordChangeSchema: z.ZodOptional<z.ZodObject<{
    changed: z.ZodOptional<z.ZodBoolean>;
    otherSessionsRevoked: z.ZodOptional<z.ZodInt>;
}, z.core.$loose>>;
export declare const StartSocialSignInBodySchema: z.ZodObject<{
    mode: typeof StorefrontSessionModeSchema;
    deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    returnPath: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const SocialSignInStartSchema: z.ZodObject<{
    authorizationUrl: z.ZodString;
    state: z.ZodString;
    expiresAt: z.ZodString;
}, z.core.$loose>;
export declare const ExchangeOneTimeTokenBodySchema: z.ZodObject<{
    state: z.ZodString;
    mode: typeof StorefrontSessionModeSchema;
    deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const ChangePasswordBodySchema: z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
    revokeOtherSessions: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const EnableTwoFactorBodySchema: z.ZodObject<{
    password: z.ZodString;
}, z.core.$strip>;
export declare const TwoFactorEnrolmentSchema: z.ZodObject<{
    otpauthUri: z.ZodString;
    backupCodes: z.ZodArray<z.ZodString>;
}, z.core.$loose>;
export declare const DisableTwoFactorBodySchema: typeof EnableTwoFactorBodySchema;
export declare const TwoFactorDisablingSchema: z.ZodOptional<z.ZodObject<{
    twoFactorEnabled: z.ZodOptional<z.ZodBoolean>;
}, z.core.$loose>>;
export declare const VerifyTwoFactorBodySchema: z.ZodObject<{
    challengeId: z.ZodString;
    code: z.ZodString;
    mode: typeof StorefrontSessionModeSchema;
    deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
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
export {};
//# sourceMappingURL=schemas.d.ts.map