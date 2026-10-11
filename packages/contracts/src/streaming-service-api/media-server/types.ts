/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */

import type { ApiErrorCode } from '@arthome/core';

import type { MediaServerAuthorizationSchema } from './schemas.js';
import type { IdentifiedAccess, JsonRequestBody, Route, mediaServer } from '../../http/index.js';
import type { RelayedTraceparentParameter } from '../../http/service.js';

export type AuthorizeMediaServerAccessRoute = Route<{
  method: 'post';
  version: 1;
  path: '/media-server/authorize';
  parameters: readonly [typeof RelayedTraceparentParameter];
  requestBody: JsonRequestBody<typeof MediaServerAuthorizationSchema, true>;
  access: IdentifiedAccess<typeof mediaServer, false>;
  responses: {
    204: { readonly description: 'Accepted: MediaMTX lets the attempt in.' };
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
  };
}>;
