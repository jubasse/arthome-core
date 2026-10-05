/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */

import type { ApiErrorCode } from '@arthome/core';

import type { ItemResponse, JsonRequestBody, PublicAccess, Route } from '../../http/index.js';
import type {
  IdempotencyKeyParameter,
  SurfaceParameter,
  TraceparentParameter,
  storefrontConventions,
} from '../components.js';
import type { DeviceRegistrationSchema, RegisterDeviceBodySchema } from './schemas.js';

export type RegisterDeviceRoute = Route<{
  method: 'post';
  version: 1;
  path: '/devices';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<typeof RegisterDeviceBodySchema, true>;
  access: PublicAccess;
  responses: {
    201: ItemResponse<typeof storefrontConventions, typeof DeviceRegistrationSchema, unknown>;
  };
  errorCodes: {
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
  };
}>;
