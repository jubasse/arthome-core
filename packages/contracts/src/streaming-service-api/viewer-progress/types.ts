/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */

import type { ApiErrorCode } from '@arthome/core';

import type { ViewerProgressBatchBodySchema, ViewerProgressSchema } from './schemas.js';
import type {
  IdentifiedAccess,
  JsonRequestBody,
  Route,
  TableResponse,
  service,
  serviceConventions,
} from '../../http/index.js';
import type {
  ActorSurfaceParameter,
  DeadlineParameter,
  RelayedTraceparentParameter,
} from '../../http/service.js';

export type GetViewerProgressBatchRoute = Route<{
  method: 'post';
  version: 1;
  path: '/viewer-progress/batch';
  parameters: readonly [
    typeof DeadlineParameter,
    typeof RelayedTraceparentParameter,
    typeof ActorSurfaceParameter,
  ];
  requestBody: JsonRequestBody<typeof ViewerProgressBatchBodySchema, true>;
  access: IdentifiedAccess<typeof service, false>;
  responses: {
    200: TableResponse<typeof serviceConventions, typeof ViewerProgressSchema>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
  };
}>;
