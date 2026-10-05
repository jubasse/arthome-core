import type { z } from 'zod';

import { Locale } from '@arthome/core';

import type {
  RequestPasswordResetStudioBody,
  SignInStudioBody,
  VerifyTwoFactorStudioBody,
} from './schemas.js';
import {
  RequestPasswordResetStudioBodySchema,
  SignInStudioBodySchema,
  VerifyTwoFactorStudioBodySchema,
} from './schemas.js';
import { SessionMode } from '../../identity/index.js';
import type { ModuleExamples } from '../../openapi/docs.js';
import { StudioSessionEstablishedSchema } from '../../studio-access/index.js';

const signInStudioBody: SignInStudioBody = {
  email: 'claire@example.org',
  password: 'un-mot-de-passe-long',
  mode: SessionMode.BEARER,
  deviceLabel: 'iPhone de Claire',
};

const verifyTwoFactorStudioBody: VerifyTwoFactorStudioBody = {
  challengeId: 'chl_7ab2',
  code: '318204',
  mode: SessionMode.BEARER,
};

const requestPasswordResetStudioBody: RequestPasswordResetStudioBody = {
  email: 'claire@example.org',
  locale: Locale.FR,
};

const bootstrap = {
  person: {
    personId: '019928b0-0000-7000-8000-000000000001',
    displayName: 'Claire D.',
  },
  channels: [],
  rightsVersion: 412,
  constants: {
    technicalProvisionThreshold: 10000,
    provisionRevisionHours: 72,
    waitlistPriorityWindowHours: 2,
    cancelDeadlineMinutesBefore: 60,
    payoutDelayDays: 14,
    commissionRateBps: 1200,
    chatBurstThresholdPerMinute: 60,
    holdScreenAutoAfterSec: 15,
    seasonBounds: {
      startsOn: '09-01',
      endsOn: '08-31',
    },
  },
  labelCatalog: {
    locale: Locale.FR,
    version: 41,
    url: 'https://cdn.arthome.fr/i18n/studio/fr/v41.json',
  },
  counters: {
    moderationPending: 14,
    inboxUnread: 2,
    dutiesTonight: 3,
  },
};

const bearerSession: z.output<typeof StudioSessionEstablishedSchema> = {
  mode: SessionMode.BEARER,
  accessToken: 'sess_7c1de4',
  refreshToken: 'refr_2b9f',
  expiresAt: '2026-09-28T17:58:00Z',
  bootstrap,
};

const cookieSession: z.output<typeof StudioSessionEstablishedSchema> = {
  mode: SessionMode.COOKIE,
  bootstrap,
};

export const authExamples: ModuleExamples = [
  [SignInStudioBodySchema, [signInStudioBody]],
  [VerifyTwoFactorStudioBodySchema, [verifyTwoFactorStudioBody]],
  [RequestPasswordResetStudioBodySchema, [requestPasswordResetStudioBody]],
  [StudioSessionEstablishedSchema, [bearerSession, cookieSession]],
];
