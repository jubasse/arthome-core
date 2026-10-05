/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */

import type { z } from 'zod';

import type { ApiErrorCode } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';

import type {
  IdentifiedAccess,
  ItemResponse,
  JsonRequestBody,
  QueryParameter,
  Route,
} from '../../http/index.js';
import type { LocaleInputSchema } from '../auth/schemas.js';
import type {
  IdempotencyKeyParameter,
  IfRightsVersionParameter,
  SurfaceParameter,
  TraceparentParameter,
  operator,
  studioConventions,
} from '../components.js';
import type {
  CreateReauthTokenBodySchema,
  DeviceIdParameter,
  DutyListSchema,
  PushRegistrationSchema,
  ReauthFactorsSchema,
  ReauthTokenSchema,
  StudioDeviceListSchema,
  StudioDeviceRevocationSchema,
  StudioPreferencesSchema,
  StudioSessionClosureSchema,
} from './schemas.js';

export type CreateReauthTokenRoute = Route<{
  method: 'post';
  version: 1;
  path: '/me/reauth';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<typeof CreateReauthTokenBodySchema, true>;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    201: ItemResponse<typeof studioConventions, typeof ReauthTokenSchema, unknown>;
  };
  errorCodes: {
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
  };
}>;

export type ListReauthFactorsRoute = Route<{
  method: 'get';
  version: 1;
  path: '/me/reauth';
  parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof ReauthFactorsSchema, unknown>;
  };
}>;

export type ListStudioDevicesRoute = Route<{
  method: 'get';
  version: 1;
  path: '/me/devices';
  parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: {
      readonly description: 'The devices, with the calling one marked.';
      readonly content: {
        readonly 'application/json': { readonly schema: typeof StudioDeviceListSchema };
      };
    };
  };
}>;

export type RevokeStudioDeviceRoute = Route<{
  method: 'delete';
  version: 1;
  path: '/me/devices/{deviceId}';
  parameters: readonly [
    typeof DeviceIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof StudioDeviceRevocationSchema, unknown>;
  };
  errorCodes: {
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
  };
}>;

export type SignOutStudioRoute = Route<{
  method: 'delete';
  version: 1;
  path: '/me/session';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof StudioSessionClosureSchema, unknown>;
  };
  errorCodes: {
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
  };
}>;

export type RegisterStudioPushTokenRoute = Route<{
  method: 'put';
  version: 1;
  path: '/me/push-registrations';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        platform: VocabularyIn<readonly ['fcm', 'apns']>;
        token: z.ZodString;
        deviceId: z.ZodString;
        locale: z.ZodOptional<typeof LocaleInputSchema>;
      } & Record<never, never>,
      z.core.$strip
    >,
    true
  >;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof PushRegistrationSchema, unknown>;
  };
  errorCodes: {
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
  };
}>;

export type UpdateStudioPreferencesRoute = Route<{
  method: 'patch';
  version: 1;
  path: '/me/preferences';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        readonly readingTimezone: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        readonly runDeskLayout: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        readonly encodingProfileName: z.ZodOptional<z.ZodOptional<z.ZodString>>;
      } & Record<never, never>,
      z.core.$strip
    >,
    true
  >;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof StudioPreferencesSchema, unknown>;
  };
  errorCodes: {
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
  };
}>;

export type ListDutiesRoute = Route<{
  method: 'get';
  version: 1;
  path: '/me/duties';
  parameters: readonly [
    QueryParameter<'from', z.ZodString, true>,
    QueryParameter<'to', z.ZodString, true>,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: {
      readonly description: 'The duties between from and to.';
      readonly content: { readonly 'application/json': { readonly schema: typeof DutyListSchema } };
    };
  };
  errorCodes: {
    400: readonly (typeof ApiErrorCode.PERIOD_FILTER_REQUIRED)[];
  };
}>;
