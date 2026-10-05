/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */

import type { IdentifiedAccess, Route } from '../../http/index.js';
import type { SurfaceParameter, TraceparentParameter, operator } from '../components.js';
import type {
  ChangesChannelParameter,
  ChangesSinceParameter,
  StudioChangesSchema,
} from './schemas.js';

export type ListStudioChangesRoute = Route<{
  method: 'get';
  version: 1;
  path: '/changes';
  parameters: readonly [
    typeof ChangesSinceParameter,
    typeof ChangesChannelParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: {
      readonly description: 'A list of invalidated tags.';
      readonly content: {
        readonly 'application/json': { readonly schema: typeof StudioChangesSchema };
      };
    };
  };
}>;
