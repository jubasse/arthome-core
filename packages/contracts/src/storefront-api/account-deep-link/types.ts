/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */

import type { IdentifiedAccess, ItemResponse, Route } from '../../http/index.js';
import type { AccountDeepLinkSchema } from '../../identity/index.js';
import type {
  SurfaceParameter,
  TraceparentParameter,
  storefrontConventions,
  viewer,
} from '../components.js';

export type GetAccountDeepLinkRoute = Route<{
  method: 'get';
  version: 1;
  path: '/account-deep-link';
  parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
  access: IdentifiedAccess<typeof viewer, false>;
  responses: {
    200: ItemResponse<typeof storefrontConventions, typeof AccountDeepLinkSchema, unknown>;
  };
}>;
