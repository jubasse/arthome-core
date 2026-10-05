/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */

import type { ApiErrorCode } from '@arthome/core';

import type { IdentifiedAccess, ItemResponse, Route } from '../../http/index.js';
import type {
  SurfaceParameter,
  TraceparentParameter,
  storefrontConventions,
  viewer,
} from '../components.js';
import type {
  PublicLinkKindParameter,
  PublicLinkSlugParameter,
  PublicLinkTargetSchema,
  PublicLinkUrlParameter,
} from './schemas.js';

export type ResolvePublicLinkRoute = Route<{
  method: 'get';
  version: 1;
  path: '/resolve';
  parameters: readonly [
    typeof PublicLinkUrlParameter,
    typeof PublicLinkKindParameter,
    typeof PublicLinkSlugParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof viewer, true>;
  responses: {
    200: ItemResponse<typeof storefrontConventions, typeof PublicLinkTargetSchema, unknown>;
  };
  errorCodes: {
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
  };
}>;
