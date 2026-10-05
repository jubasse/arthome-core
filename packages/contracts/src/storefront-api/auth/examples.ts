import type { z } from 'zod';

import { Locale, MessageDomain } from '@arthome/core';

import type {
  ChangePasswordBody,
  ConfirmEmailVerificationBody,
  DisableTwoFactorBody,
  EmailVerification,
  EmailVerificationQueueing,
  EnableTwoFactorBody,
  ExchangeOneTimeTokenBody,
  PasswordChange,
  RequestPasswordResetBody,
  ResetPasswordBody,
  SignInBody,
  SignOutAnswer,
  SignUpBody,
  SocialSignInStart,
  StartSocialSignInBody,
  TwoFactorDisabling,
  TwoFactorEnrolment,
  VerifyTwoFactorBody,
} from './schemas.js';
import {
  ChangePasswordBodySchema,
  ConfirmEmailVerificationBodySchema,
  DisableTwoFactorBodySchema,
  EmailVerificationQueueingSchema,
  EmailVerificationSchema,
  EnableTwoFactorBodySchema,
  ExchangeOneTimeTokenBodySchema,
  PasswordChangeSchema,
  RequestPasswordResetBodySchema,
  ResetPasswordBodySchema,
  SignInBodySchema,
  SignOutAnswerSchema,
  SignUpBodySchema,
  SocialSignInStartSchema,
  StartSocialSignInBodySchema,
  TwoFactorDisablingSchema,
  TwoFactorEnrolmentSchema,
  VerifyTwoFactorBodySchema,
} from './schemas.js';
import type { ViewerContextSchema } from '../../identity/index.js';
import { SessionMode, StorefrontSessionEstablishedSchema } from '../../identity/index.js';
import type { ModuleExamples } from '../../openapi/docs.js';

const DEVICE_ID = '019928f4-1b6c-7c3a-9f2e-6a1d0c4b8e77';

const viewerContext: z.output<typeof ViewerContextSchema> = {
  deviceId: DEVICE_ID,
  signedIn: true,
  profiles: [],
  constants: {
    roomOpensMinutesBefore: 30,
    cancelDeadlineMinutesBefore: 60,
    scarcityThresholdBps: 8500,
    billboardPreviewDelaySec: 4,
    waitlistPriorityWindowHours: 2,
    chatRateLimitPerSecond: 6,
    reminderLeadMinutes: 30,
    replayExpiryWarningHours: 6,
  },
  labelCatalog: {
    domain: MessageDomain.STOREFRONT,
    locale: Locale.FR,
    version: 41,
    url: 'https://cdn.arthome.fr/i18n/storefront/fr/v41.json',
  },
  taxonomyArtifact: {
    domain: MessageDomain.TAXONOMY,
    locale: Locale.FR,
    version: 12,
    url: 'https://cdn.arthome.fr/taxonomy/fr/v12.json',
  },
};

const cookieSession: z.output<typeof StorefrontSessionEstablishedSchema> = {
  mode: SessionMode.COOKIE,
  viewerContext,
};

const bearerSession: z.output<typeof StorefrontSessionEstablishedSchema> = {
  mode: SessionMode.BEARER,
  accessToken: 'sess_9f2ac1b4',
  refreshToken: 'refr_4d77e2',
  expiresAt: '2026-09-28T18:00:10Z',
  viewerContext,
};

const signUpBody: SignUpBody = {
  email: 'marie@example.org',
  password: 'a-long-password',
  displayName: 'Marie J.',
  mode: SessionMode.COOKIE,
  acceptedTermsVersion: 3,
  locale: Locale.FR,
};

const signInBody: SignInBody = {
  email: 'marie@example.org',
  password: 'a-long-password',
  mode: SessionMode.BEARER,
  deviceId: DEVICE_ID,
};

const signOutAnswer: SignOutAnswer = { signedOut: true };

const confirmEmailVerificationBody: ConfirmEmailVerificationBody = { token: 'vrf_4b2c9e1f7a0d' };

const emailVerification: EmailVerification = { verified: true };

const emailVerificationQueueing: EmailVerificationQueueing = { queued: true };

const requestPasswordResetBody: RequestPasswordResetBody = {
  email: 'marie@example.org',
  locale: Locale.FR,
};

const resetPasswordBody: ResetPasswordBody = { token: 'rst_9f2ac1', password: 'a-new-password' };

const passwordChange: PasswordChange = { changed: true, otherSessionsRevoked: 3 };

const startSocialSignInBody: StartSocialSignInBody = {
  mode: SessionMode.BEARER,
  deviceId: DEVICE_ID,
  returnPath: '/compte',
};

const socialSignInStart: SocialSignInStart = {
  authorizationUrl: 'https://api.arthome.fr/v1/auth/social/google/redirect?state=ott_9f2ac1',
  state: 'ott_9f2ac1',
  expiresAt: '2026-09-21T18:13:00Z',
};

const exchangeOneTimeTokenBody: ExchangeOneTimeTokenBody = {
  state: 'ott_9f2ac1',
  mode: SessionMode.BEARER,
  deviceId: DEVICE_ID,
};

const changePasswordBody: ChangePasswordBody = {
  currentPassword: 'an-old-password',
  newPassword: 'a-new-password',
};

const enableTwoFactorBody: EnableTwoFactorBody = { password: 'a-long-password' };

const twoFactorEnrolment: TwoFactorEnrolment = {
  otpauthUri: 'otpauth://totp/Arthome:marie%40example.org?secret=JBSWY3DP&issuer=Arthome',
  backupCodes: ['7K2M-9QP4', 'X3N8-2VTR'],
};

const disableTwoFactorBody: DisableTwoFactorBody = { password: 'a-long-password' };

const twoFactorDisabling: TwoFactorDisabling = { twoFactorEnabled: false };

const verifyTwoFactorBody: VerifyTwoFactorBody = {
  challengeId: 'chl_7ab2',
  code: '318204',
  mode: SessionMode.COOKIE,
};

export const authExamples: ModuleExamples = [
  [StorefrontSessionEstablishedSchema, [cookieSession, bearerSession]],
  [SignUpBodySchema, [signUpBody]],
  [SignInBodySchema, [signInBody]],
  [SignOutAnswerSchema, [signOutAnswer]],
  [ConfirmEmailVerificationBodySchema, [confirmEmailVerificationBody]],
  [EmailVerificationSchema, [emailVerification]],
  [EmailVerificationQueueingSchema, [emailVerificationQueueing]],
  [RequestPasswordResetBodySchema, [requestPasswordResetBody]],
  [ResetPasswordBodySchema, [resetPasswordBody]],
  [PasswordChangeSchema, [passwordChange]],
  [StartSocialSignInBodySchema, [startSocialSignInBody]],
  [SocialSignInStartSchema, [socialSignInStart]],
  [ExchangeOneTimeTokenBodySchema, [exchangeOneTimeTokenBody]],
  [ChangePasswordBodySchema, [changePasswordBody]],
  [EnableTwoFactorBodySchema, [enableTwoFactorBody]],
  [TwoFactorEnrolmentSchema, [twoFactorEnrolment]],
  [DisableTwoFactorBodySchema, [disableTwoFactorBody]],
  [TwoFactorDisablingSchema, [twoFactorDisabling]],
  [VerifyTwoFactorBodySchema, [verifyTwoFactorBody]],
];
