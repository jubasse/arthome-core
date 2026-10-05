/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */
import type { ApiErrorCode } from '@arthome/core';
import type { IdentifiedAccess, ItemResponse, Route } from '../../http/index.js';
import type { StudioBootstrapSchema } from '../../studio-access/index.js';
import type { SurfaceParameter, TraceparentParameter, operator, studioConventions } from '../components.js';
export type GetStudioBootstrapRoute = Route<{
    method: 'get';
    version: 1;
    path: '/bootstrap';
    parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
    access: IdentifiedAccess<typeof operator, false>;
    responses: {
        200: ItemResponse<typeof studioConventions, typeof StudioBootstrapSchema, unknown>;
    };
    errorCodes: {
        503: readonly (typeof ApiErrorCode.SERVICE_UNAVAILABLE)[];
    };
}>;
//# sourceMappingURL=types.d.ts.map