import {
  CreateReauthTokenBodySchema,
  DeviceIdParameter,
  DutiesPeriod,
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
import type {
  CreateReauthTokenRoute,
  ListDutiesRoute,
  ListReauthFactorsRoute,
  ListStudioDevicesRoute,
  RegisterStudioPushTokenRoute,
  RevokeStudioDeviceRoute,
  SignOutStudioRoute,
  UpdateStudioPreferencesRoute,
} from './types.js';
import { throttle } from '../../http/index.js';
import {
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  operator,
  studioV1,
} from '../components.js';

const me = studioV1.identity(operator).headers(SurfaceParameter, TraceparentParameter).path('me');
const account = me.tags(StudioTag.BOOTSTRAP);

export const createReauthToken: CreateReauthTokenRoute = account
  .requires(throttle('reauth'))
  .single('reauth', { owner: 'caller' })
  .create({
    operationId: 'createReauthToken',
    summary: 'Mints the re-authentication token the four sensitive commands require.',
    body: CreateReauthTokenBodySchema,
    item: ReauthTokenSchema,
    answer: 'Token minted, single-use.',
  });

export const listReauthFactors: ListReauthFactorsRoute = account
  .single('reauth', { owner: 'caller' })
  .find({
    operationId: 'listReauthFactors',
    summary: 'The re-authentication factors accepted for this device.',
    item: ReauthFactorsSchema,
    answer: "The accepted factors, in the server's order of preference.",
  });

export const listStudioDevices: ListStudioDevicesRoute = account
  .single('devices', { owner: 'caller' })
  .find({
    operationId: 'listStudioDevices',
    summary: 'The devices this person is signed in to the studio on.',
    responses: {
      200: {
        description: 'The devices, with the calling one marked.',
        content: { 'application/json': { schema: StudioDeviceListSchema } },
      },
    },
  });

export const revokeStudioDevice: RevokeStudioDeviceRoute = account
  .resource('devices', { id: DeviceIdParameter, owner: 'caller' })
  .delete({
    operationId: 'revokeStudioDevice',
    summary: 'Revokes a studio device — the phone left behind in a room.',
    response: StudioDeviceRevocationSchema,
    answer: 'Device revoked, with the delay before it takes effect on commands.',
  });

export const signOutStudio: SignOutStudioRoute = account
  .identity(operator, {
    csrfExempt:
      'A forged sign-out ends a session and grants nothing, and a browser that lost its CSRF cookie must still be able to sign out.',
  })
  .single('session', { owner: 'caller' })
  .delete({
    operationId: 'signOutStudio',
    summary: "Signing out — an operator's only way out, and it did not exist.",
    response: StudioSessionClosureSchema,
    answer: 'Session closed. Replayed on an already-closed session, it succeeds.',
  });

export const registerStudioPushToken: RegisterStudioPushTokenRoute = account
  .single('push-registrations', { owner: 'caller' })
  .replace({
    operationId: 'registerStudioPushToken',
    summary: 'Registers the push token — without it, a duty does not wake up.',
    body: RegisterStudioPushTokenBodySchema,
    item: PushRegistrationSchema,
    answer: 'Token registered.',
  });

export const updateStudioPreferences: UpdateStudioPreferencesRoute = account
  .single('preferences', { owner: 'caller' })
  .update({
    operationId: 'updateStudioPreferences',
    summary: "Writes one of the person's preferences — reading timezone, control-room layout.",
    body: UpdateStudioPreferencesBodySchema,
    item: StudioPreferencesSchema,
    answer: 'Preferences up to date.',
  });

export const listDuties: ListDutiesRoute = me
  .tags(StudioTag.AGENDA)
  .single('duties', { owner: 'caller' })
  .find({
    operationId: 'listDuties',
    summary: 'My duties — across all channels, with the overlaps.',
    parameters: [...DutiesPeriod.parameters],
    errors: [...DutiesPeriod.errors],
    responses: {
      200: {
        description: 'The duties between from and to.',
        content: { 'application/json': { schema: DutyListSchema } },
      },
    },
  });
