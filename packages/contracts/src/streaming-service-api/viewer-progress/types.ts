/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */

import type { z } from 'zod';

import type { ApiErrorCode } from '@arthome/core';

import type { ViewerProgressBatchBodySchema, ViewerProgressSchema } from './schemas.js';
import type {
  HeaderParameter,
  IdentifiedAccess,
  JsonRequestBody,
  Route,
  TableResponse,
  service,
  serviceConventions,
} from '../../http/index.js';

export type GetViewerProgressBatchRoute = Route<{
  method: 'post';
  version: 1;
  path: '/viewer-progress/batch';
  parameters: readonly [
    HeaderParameter<'x-arthome-deadline', z.ZodString, true>,
    HeaderParameter<'traceparent', z.ZodString>,
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
