/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */

import type { ApiErrorCode } from '@arthome/core';

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
  RelayedTraceparentParameter,
} from '../../http/service.js';
import type {
  PlaybackPositionSchema,
  RecordPlaybackPositionBodySchema,
} from '../../storefront-api/me/schemas.js';
import type { DateIdParameter } from '../components.js';

export type RecordPlaybackPositionRoute = Route<{
  method: 'put';
  version: 1;
  path: '/me/progress/{dateId}';
  parameters: readonly [
    typeof DateIdParameter,
    typeof DeadlineParameter,
    typeof RelayedTraceparentParameter,
    typeof ActorSurfaceParameter,
  ];
  requestBody: JsonRequestBody<typeof RecordPlaybackPositionBodySchema, true>;
  access: IdentifiedAccess<typeof service, false>;
  responses: {
    200: ItemResponse<typeof serviceConventions, typeof PlaybackPositionSchema, unknown>;
  };
  errorCodes: {
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
  };
}>;
