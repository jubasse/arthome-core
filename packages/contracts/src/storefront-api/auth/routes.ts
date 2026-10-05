import { IdentityErrorCode } from '@arthome/core';

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
  SocialProviderParameter,
  SocialSignInStartSchema,
  StartSocialSignInBodySchema,
  TwoFactorDisablingSchema,
  TwoFactorEnrolmentSchema,
  VerifyTwoFactorBodySchema,
} from './schemas.js';
import type {
  ChangePasswordRoute,
  ConfirmEmailVerificationRoute,
  DisableTwoFactorRoute,
  EnableTwoFactorRoute,
  ExchangeOneTimeTokenRoute,
  RequestPasswordResetRoute,
  ResendEmailVerificationRoute,
  ResetPasswordRoute,
  SignInRoute,
  SignOutRoute,
  SignUpRoute,
  StartSocialSignInRoute,
  VerifyTwoFactorRoute,
} from './types.js';
import { Acknowledged, throttle } from '../../http/index.js';
import { StorefrontSessionEstablishedSchema } from '../../identity/index.js';
import {
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  storefrontV1,
  viewer,
} from '../components.js';

const account = storefrontV1
  .tags(StorefrontTag.ACCOUNT)
  .headers(SurfaceParameter, TraceparentParameter);
const signedOut = account.public().single('auth');
const signedIn = account.identity(viewer).single('auth');
const signOutOnly = account
  .identity(viewer, {
    csrfExempt:
      'A forged sign-out ends a session and grants nothing, and a browser that lost its CSRF cookie must still be able to sign out.',
  })
  .single('auth');

export const signUp: SignUpRoute = signedOut.action('sign-up', {
  operationId: 'signUp',
  summary: 'Creates an account with email and password.',
  body: SignUpBodySchema,
  response: StorefrontSessionEstablishedSchema,
  status: 201,
  requires: [throttle('auth')],
  errors: [IdentityErrorCode.EMAIL_TAKEN],
  answer: 'Account created and session opened, in the requested mode.',
});

export const signIn: SignInRoute = signedOut.action('sign-in', {
  operationId: 'signIn',
  summary: 'Opens a session with email and password.',
  body: SignInBodySchema,
  response: StorefrontSessionEstablishedSchema,
  idempotent: false,
  requires: [throttle('auth')],
  errors: [IdentityErrorCode.INVALID_CREDENTIALS, IdentityErrorCode.TWO_FACTOR_REQUIRED],
  answer: 'Session opened, in the requested mode.',
});

export const signOut: SignOutRoute = signOutOnly.action('sign-out', {
  operationId: 'signOut',
  summary: 'Closes the current session — and nothing else.',
  response: SignOutAnswerSchema,
  answer: 'Session closed. Replayed, it succeeds.',
});

export const confirmEmailVerification: ConfirmEmailVerificationRoute = signedOut.action(
  'verify-email',
  {
    operationId: 'confirmEmailVerification',
    summary: 'Confirms an email address from the link sent to it.',
    'x-arthome-invalidates': ['account:profile'],
    body: ConfirmEmailVerificationBodySchema,
    response: EmailVerificationSchema,
    requires: [throttle('auth')],
    errors: [IdentityErrorCode.VERIFICATION_LINK_INVALID],
    answer: 'The address is verified.',
  },
);

export const resendEmailVerification: ResendEmailVerificationRoute = signedIn.action(
  'verify-email/resend',
  {
    operationId: 'resendEmailVerification',
    summary: "Queues a fresh verification link for the signed-in account's address.",
    response: EmailVerificationQueueingSchema,
    requires: [throttle('auth')],
    answer: 'A link was queued for sending, or the address is already verified.',
  },
);

export const requestPasswordReset: RequestPasswordResetRoute = signedOut.action('forget-password', {
  operationId: 'requestPasswordReset',
  summary: 'Requests a password reset link.',
  body: RequestPasswordResetBodySchema,
  response: Acknowledged,
  status: 202,
  requires: [throttle('auth')],
  answer: 'Request accepted — the answer is the same in both cases.',
});

export const resetPassword: ResetPasswordRoute = signedOut.action('reset-password', {
  operationId: 'resetPassword',
  summary: 'Sets a new password from a reset token.',
  body: ResetPasswordBodySchema,
  response: PasswordChangeSchema,
  errors: [IdentityErrorCode.RESET_TOKEN_EXPIRED],
  answer:
    'Password changed. **All other sessions are revoked** — a password changed after a theft must close the door.',
});

export const startSocialSignIn: StartSocialSignInRoute = signedOut
  .resource('social', { id: SocialProviderParameter })
  .action('start', {
    operationId: 'startSocialSignIn',
    summary: 'Starts a social sign-in — the surfaces never talk to the provider.',
    body: StartSocialSignInBodySchema,
    response: SocialSignInStartSchema,
    answer: 'The authorization address to open, and the opaque state that will come back.',
  });

export const exchangeOneTimeToken: ExchangeOneTimeTokenRoute = signedOut.action('exchange', {
  operationId: 'exchangeOneTimeToken',
  summary: 'Exchanges the opaque state from the return for a session.',
  body: ExchangeOneTimeTokenBodySchema,
  response: StorefrontSessionEstablishedSchema,
  errors: [IdentityErrorCode.ONE_TIME_TOKEN_EXPIRED],
  answer: 'Session opened in the requested mode.',
});

export const changePassword: ChangePasswordRoute = signedIn.action('change-password', {
  operationId: 'changePassword',
  summary: 'Changes the password from the account.',
  body: ChangePasswordBodySchema,
  response: PasswordChangeSchema,
  requires: [throttle('auth')],
  answer: 'Password changed.',
});

export const enableTwoFactor: EnableTwoFactorRoute = signedIn.action('two-factor', {
  operationId: 'enableTwoFactor',
  summary: 'Enables two-factor authentication and returns the backup codes.',
  body: EnableTwoFactorBodySchema,
  response: TwoFactorEnrolmentSchema,
  status: 201,
  answer: 'Secret to enrol and backup codes, returned **once only**.',
});

export const disableTwoFactor: DisableTwoFactorRoute = signedIn.action('two-factor', {
  operationId: 'disableTwoFactor',
  summary: 'Disables two-factor authentication.',
  method: 'delete',
  body: DisableTwoFactorBodySchema,
  response: TwoFactorDisablingSchema,
  answer: 'Two-factor authentication disabled.',
});

export const verifyTwoFactor: VerifyTwoFactorRoute = signedOut.action('two-factor/verify', {
  operationId: 'verifyTwoFactor',
  summary: 'Answers the two-factor challenge, and opens the session.',
  body: VerifyTwoFactorBodySchema,
  response: StorefrontSessionEstablishedSchema,
  errors: [IdentityErrorCode.INVALID_CREDENTIALS, IdentityErrorCode.TWO_FACTOR_CHALLENGE_EXPIRED],
  answer: 'Session opened, in the requested mode.',
});
