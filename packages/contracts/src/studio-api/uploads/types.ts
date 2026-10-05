/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */

import type { ApiErrorCode } from '@arthome/core';

import type { IdentifiedAccess, ItemResponse, JsonRequestBody, Route } from '../../http/index.js';
import type { UploadTicketSchema } from '../../studio-stage/index.js';
import type {
  IdempotencyKeyParameter,
  IfRightsVersionParameter,
  SurfaceParameter,
  TraceparentParameter,
  operator,
  studioConventions,
} from '../components.js';
import type { CreateUploadTicketBodySchema } from './schemas.js';

export type CreateUploadTicketRoute = Route<{
  method: 'post';
  version: 1;
  path: '/uploads';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<typeof CreateUploadTicketBodySchema, true>;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    201: ItemResponse<typeof studioConventions, typeof UploadTicketSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
  };
}>;
