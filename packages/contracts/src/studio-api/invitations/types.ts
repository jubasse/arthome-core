/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */

import type { ApiErrorCode, DomainErrorCode } from '@arthome/core';

import type { IdentifiedAccess, ItemResponse, JsonRequestBody, Route } from '../../http/index.js';
import type { EffectiveRightsSchema } from '../../studio-access/index.js';
import type {
  IdempotencyKeyParameter,
  IfRightsVersionParameter,
  SurfaceParameter,
  TraceparentParameter,
  operator,
  studioConventions,
} from '../components.js';
import type { InvitationIdParameter, RespondToInvitationBodySchema } from './schemas.js';

export type RespondToInvitationRoute = Route<{
  method: 'post';
  version: 1;
  path: '/invitations/{invitationId}/response';
  parameters: readonly [
    typeof InvitationIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<typeof RespondToInvitationBodySchema, true>;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof EffectiveRightsSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT
      | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
      | typeof DomainErrorCode.STATE_CONFLICT
    )[];
  };
}>;
