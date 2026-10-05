/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */

import type { ApiErrorCode } from '@arthome/core';

import type { RailSchema } from '../../catalog/index.js';
import type { IdentifiedAccess, ItemResponse, Route } from '../../http/index.js';
import type {
  CursorParameter,
  LimitParameter,
  SurfaceParameter,
  TraceparentParameter,
  storefrontConventions,
  viewer,
} from '../components.js';
import type { RailIdParameter } from './schemas.js';

export type ExtendRailRoute = Route<{
  method: 'get';
  version: 1;
  path: '/rails/{railId}';
  parameters: readonly [
    typeof RailIdParameter,
    typeof CursorParameter,
    typeof LimitParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof viewer, true>;
  responses: {
    200: ItemResponse<typeof storefrontConventions, typeof RailSchema, unknown>;
  };
  errorCodes: {
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    410: readonly (typeof ApiErrorCode.CURSOR_TOO_OLD)[];
  };
}>;
