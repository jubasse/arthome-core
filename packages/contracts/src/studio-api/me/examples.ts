import { CrewRole, Locale, RunState } from '@arthome/core';

import type {
  CreateReauthTokenBody,
  DutyList,
  PushRegistration,
  ReauthFactors,
  ReauthToken,
  RegisterStudioPushTokenBody,
  StudioDeviceList,
  StudioDeviceRevocation,
  StudioPreferences,
  StudioSessionClosure,
  UpdateStudioPreferencesBody,
} from './schemas.js';
import {
  CreateReauthTokenBodySchema,
  DutyListSchema,
  PushRegistrationSchema,
  ReauthFactorsSchema,
  ReauthTokenSchema,
  RegisterStudioPushTokenBodySchema,
  StudioDeviceListSchema,
  StudioDeviceRevocationSchema,
  StudioPreferencesSchema,
  StudioSessionClosureSchema,
  UpdateStudioPreferencesBodySchema,
} from './schemas.js';
import type { ModuleExamples } from '../../openapi/docs.js';

const createReauthTokenBody: CreateReauthTokenBody = {
  intent: 'rotate_stream_key',
  factor: 'platform_biometric',
};

const reauthToken: ReauthToken = {
  reauthToken: 'ott_9f2ac1',
  intent: 'rotate_stream_key',
  expiresAt: '2026-09-21T18:44:50Z',
};

const reauthFactors: ReauthFactors = {
  acceptedFactors: ['platform_biometric', 'totp', 'backup_code'],
  platformBiometricEnrolled: true,
};

const studioDeviceList: StudioDeviceList = {
  servedAt: '2026-09-21T18:52:00.000Z',
  rightsVersion: 412,
  items: [
    {
      deviceId: '019928eb-0000-7000-8000-000000000001',
      label: 'iPhone de Claire',
      platform: 'ios',
      city: 'Paris',
      lastSeenAt: '2026-09-21T18:51:00Z',
      isCurrent: true,
    },
  ],
};

const studioDeviceRevocation: StudioDeviceRevocation = {
  revoked: true,
  commandsStopWithinSec: 60,
};

const studioSessionClosure: StudioSessionClosure = { signedOut: true };

const registerStudioPushTokenBody: RegisterStudioPushTokenBody = {
  platform: 'apns',
  token: 'a1b2c3…',
  deviceId: '019928eb-0000-7000-8000-000000000001',
  locale: Locale.FR,
};

const pushRegistration: PushRegistration = { registered: true };

const updateStudioPreferencesBody: UpdateStudioPreferencesBody = {
  readingTimezone: 'Europe/Paris',
  runDeskLayout: 'compact',
};

const studioPreferences: StudioPreferences = {
  readingTimezone: 'Europe/Paris',
  runDeskLayout: 'compact',
};

const dutyList: DutyList = {
  servedAt: '2026-09-21T18:00:30.000Z',
  rightsVersion: 412,
  items: [
    {
      dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
      channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
      channelName: 'Compagnie Verticale',
      title: 'Nuit blanche',
      crewRole: CrewRole.DIRECTOR,
      startsAt: '2026-09-21T19:00:00Z',
      runState: RunState.IDLE,
      overlapsWith: [],
      accessExpiresAt: '2026-09-21T21:45:00Z',
    },
  ],
};

export const meExamples: ModuleExamples = [
  [CreateReauthTokenBodySchema, [createReauthTokenBody]],
  [ReauthTokenSchema, [reauthToken]],
  [ReauthFactorsSchema, [reauthFactors]],
  [StudioDeviceListSchema, [studioDeviceList]],
  [StudioDeviceRevocationSchema, [studioDeviceRevocation]],
  [StudioSessionClosureSchema, [studioSessionClosure]],
  [RegisterStudioPushTokenBodySchema, [registerStudioPushTokenBody]],
  [PushRegistrationSchema, [pushRegistration]],
  [UpdateStudioPreferencesBodySchema, [updateStudioPreferencesBody]],
  [StudioPreferencesSchema, [studioPreferences]],
  [DutyListSchema, [dutyList]],
];
