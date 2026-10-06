/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */

import type { ApiErrorCode, CatalogErrorCode, DomainErrorCode } from '@arthome/core';

import type {
  IdentifiedAccess,
  ItemResponse,
  JsonRequestBody,
  Route,
  service,
  serviceConventions,
} from '../../http/index.js';
import type {
  ActorSurfaceParameter,
  DeadlineParameter,
  RelayedIdempotencyKeyParameter,
  RelayedTraceparentParameter,
} from '../../http/service.js';
import type { DateIdParameter } from '../../storefront-api/components.js';
import type {
  RaiseIncidentBodySchema,
  RunTransitionBodySchema,
  TechnicalCheckSchema,
} from '../../studio-api/dates/schemas.js';
import type { RunConsoleSchema, StudioIncidentSchema } from '../../studio-stage/index.js';

export type GetRunConsoleRoute = Route<{
  method: 'get';
  version: 1;
  path: '/dates/{dateId}/run';
  parameters: readonly [
    typeof DateIdParameter,
    typeof DeadlineParameter,
    typeof RelayedTraceparentParameter,
  ];
  access: IdentifiedAccess<typeof service, false>;
  responses: {
    200: ItemResponse<typeof serviceConventions, typeof RunConsoleSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
  };
}>;

export type RunTechnicalCheckRoute = Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/run/technical-check';
  parameters: readonly [
    typeof DateIdParameter,
    typeof RelayedIdempotencyKeyParameter,
    typeof DeadlineParameter,
    typeof RelayedTraceparentParameter,
    typeof ActorSurfaceParameter,
  ];
  access: IdentifiedAccess<typeof service, false>;
  responses: {
    200: ItemResponse<typeof serviceConventions, typeof TechnicalCheckSchema, unknown>;
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

export type RehearseRunRoute = Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/run/rehearse';
  parameters: readonly [
    typeof DateIdParameter,
    typeof RelayedIdempotencyKeyParameter,
    typeof DeadlineParameter,
    typeof RelayedTraceparentParameter,
    typeof ActorSurfaceParameter,
  ];
  requestBody: JsonRequestBody<typeof RunTransitionBodySchema, true>;
  access: IdentifiedAccess<typeof service, false>;
  responses: {
    200: ItemResponse<typeof serviceConventions, typeof RunConsoleSchema, unknown>;
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

export type GoOnAirRoute = Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/run/go-on-air';
  parameters: readonly [
    typeof DateIdParameter,
    typeof RelayedIdempotencyKeyParameter,
    typeof DeadlineParameter,
    typeof RelayedTraceparentParameter,
    typeof ActorSurfaceParameter,
  ];
  requestBody: JsonRequestBody<typeof RunTransitionBodySchema, true>;
  access: IdentifiedAccess<typeof service, false>;
  responses: {
    200: ItemResponse<typeof serviceConventions, typeof RunConsoleSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT
      | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
      | typeof CatalogErrorCode.TECHNICAL_CHECK_REQUIRED
      | typeof DomainErrorCode.PUBLICATION_TRANSITION_FORBIDDEN
      | typeof DomainErrorCode.STATE_CONFLICT
    )[];
  };
}>;

export type EndRunRoute = Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/run/end';
  parameters: readonly [
    typeof DateIdParameter,
    typeof RelayedIdempotencyKeyParameter,
    typeof DeadlineParameter,
    typeof RelayedTraceparentParameter,
    typeof ActorSurfaceParameter,
  ];
  requestBody: JsonRequestBody<typeof RunTransitionBodySchema, true>;
  access: IdentifiedAccess<typeof service, false>;
  responses: {
    200: ItemResponse<typeof serviceConventions, typeof RunConsoleSchema, unknown>;
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

export type ResetRunRoute = Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/run/reset';
  parameters: readonly [
    typeof DateIdParameter,
    typeof RelayedIdempotencyKeyParameter,
    typeof DeadlineParameter,
    typeof RelayedTraceparentParameter,
    typeof ActorSurfaceParameter,
  ];
  requestBody: JsonRequestBody<typeof RunTransitionBodySchema, true>;
  access: IdentifiedAccess<typeof service, false>;
  responses: {
    200: ItemResponse<typeof serviceConventions, typeof RunConsoleSchema, unknown>;
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

export type RaiseIncidentRoute = Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/incidents';
  parameters: readonly [
    typeof DateIdParameter,
    typeof RelayedIdempotencyKeyParameter,
    typeof DeadlineParameter,
    typeof RelayedTraceparentParameter,
    typeof ActorSurfaceParameter,
  ];
  requestBody: JsonRequestBody<typeof RaiseIncidentBodySchema, true>;
  access: IdentifiedAccess<typeof service, false>;
  responses: {
    201: ItemResponse<typeof serviceConventions, typeof StudioIncidentSchema, unknown>;
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
