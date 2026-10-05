/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */

import type { ApiErrorCode } from '@arthome/core';

import type { DateCardSchema } from '../../catalog/index.js';
import type { IdentifiedAccess, PageResponse, Route } from '../../http/index.js';
import type {
  CursorParameter,
  LimitParameter,
  SurfaceParameter,
  TraceparentParameter,
  storefrontConventions,
  viewer,
} from '../components.js';
import type { ReplayCategoryParameter, ReplaySortParameter } from './schemas.js';

export type ListReplaysRoute = Route<{
  method: 'get';
  version: 1;
  path: '/replays';
  parameters: readonly [
    typeof CursorParameter,
    typeof LimitParameter,
    typeof ReplaySortParameter,
    typeof ReplayCategoryParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof viewer, true>;
  responses: {
    200: PageResponse<typeof storefrontConventions, typeof DateCardSchema>;
  };
  errorCodes: {
    400: readonly (typeof ApiErrorCode.SCHEMA_INVALID)[];
  };
}>;
