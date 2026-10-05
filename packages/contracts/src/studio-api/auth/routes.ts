import { IdentityErrorCode } from '@arthome/core';

import {
  RequestPasswordResetStudioBodySchema,
  SignInStudioBodySchema,
  VerifyTwoFactorStudioBodySchema,
} from './schemas.js';
import type {
  RequestPasswordResetStudioRoute,
  SignInStudioRoute,
  VerifyTwoFactorStudioRoute,
} from './types.js';
import { Acknowledged, throttle } from '../../http/index.js';
import { StudioSessionEstablishedSchema } from '../../studio-access/index.js';
import { StudioTag, SurfaceParameter, TraceparentParameter, studioV1 } from '../components.js';

const auth = studioV1
  .public()
  .headers(SurfaceParameter, TraceparentParameter)
  .tags(StudioTag.BOOTSTRAP)
  .single('auth');

export const signInStudio: SignInStudioRoute = auth.collectionAction('sign-in', {
  operationId: 'signInStudio',
  summary: 'Opens a professional session.',
  idempotent: false,
  requires: [throttle('SIGN_IN_PER_ADDRESS'), throttle('SIGN_IN_PER_EMAIL')],
  body: SignInStudioBodySchema,
  response: StudioSessionEstablishedSchema,
  answer: 'Session opened and bootstrap served, in the requested mode.',
  errors: [IdentityErrorCode.INVALID_CREDENTIALS, IdentityErrorCode.TWO_FACTOR_REQUIRED],
});

export const verifyTwoFactorStudio: VerifyTwoFactorStudioRoute = auth.collectionAction(
  'two-factor/verify',
  {
    operationId: 'verifyTwoFactorStudio',
    summary: 'Answers the two-factor challenge.',
    body: VerifyTwoFactorStudioBodySchema,
    response: StudioSessionEstablishedSchema,
    answer: 'Session opened.',
    errors: [IdentityErrorCode.INVALID_CREDENTIALS, IdentityErrorCode.TWO_FACTOR_CHALLENGE_EXPIRED],
  },
);

export const requestPasswordResetStudio: RequestPasswordResetStudioRoute = auth.collectionAction(
  'forget-password',
  {
    operationId: 'requestPasswordResetStudio',
    summary: 'Requests a password reset link.',
    requires: [throttle('password-reset')],
    body: RequestPasswordResetStudioBodySchema,
    response: Acknowledged,
    status: 202,
    answer: 'Request accepted — the answer is identical in both cases.',
  },
);
