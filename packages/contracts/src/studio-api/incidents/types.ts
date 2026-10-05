/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */

import type { ApiErrorCode } from '@arthome/core';

import type { IdentifiedAccess, ItemResponse, JsonRequestBody, Route } from '../../http/index.js';
import type {
  IdempotencyKeyParameter,
  IfRightsVersionParameter,
  SurfaceParameter,
  TraceparentParameter,
  operator,
  studioConventions,
} from '../components.js';
import type {
  EscalateIncidentBodySchema,
  IncidentEscalationSchema,
  IncidentIdParameter,
  IncidentResolutionSchema,
} from './schemas.js';

export type ResolveIncidentRoute = Route<{
  method: 'post';
  version: 1;
  path: '/incidents/{incidentId}/resolve';
  parameters: readonly [
    typeof IncidentIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof IncidentResolutionSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
  };
}>;

export type EscalateIncidentToProductionRoute = Route<{
  method: 'post';
  version: 1;
  path: '/incidents/{incidentId}/escalate';
  parameters: readonly [
    typeof IncidentIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<typeof EscalateIncidentBodySchema, true>;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    202: ItemResponse<typeof studioConventions, typeof IncidentEscalationSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
  };
}>;
