/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */

import type { ChangeFeedSchema } from '../../engagement/index.js';
import type { IdentifiedAccess, ItemResponse, Route } from '../../http/index.js';
import type {
  SurfaceParameter,
  TraceparentParameter,
  storefrontConventions,
  viewer,
} from '../components.js';
import type { ChangesScopeParameter, ChangesSinceParameter } from './schemas.js';

export type ListChangesRoute = Route<{
  method: 'get';
  version: 1;
  path: '/changes';
  parameters: readonly [
    typeof ChangesSinceParameter,
    typeof ChangesScopeParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof viewer, false>;
  responses: {
    200: ItemResponse<typeof storefrontConventions, typeof ChangeFeedSchema, unknown>;
  };
}>;
