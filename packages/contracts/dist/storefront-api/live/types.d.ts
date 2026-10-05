/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */
import type { LiveScreenSchema } from '../../catalog/index.js';
import type { IdentifiedAccess, ItemResponse, Route } from '../../http/index.js';
import type { SurfaceParameter, TraceparentParameter, ViewerTimezoneParameter, storefrontConventions, viewer } from '../components.js';
export type GetLiveScreenRoute = Route<{
    method: 'get';
    version: 1;
    path: '/live';
    parameters: readonly [
        typeof ViewerTimezoneParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, true>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof LiveScreenSchema, unknown>;
    };
}>;
//# sourceMappingURL=types.d.ts.map