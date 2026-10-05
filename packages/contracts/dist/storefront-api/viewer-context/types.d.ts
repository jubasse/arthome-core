/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */
import type { IdentifiedAccess, ItemResponse, Route } from '../../http/index.js';
import type { ViewerContextSchema } from '../../identity/index.js';
import type { SurfaceParameter, TraceparentParameter, ViewerTimezoneParameter, storefrontConventions, viewerOrDevice } from '../components.js';
export type GetViewerContextRoute = Route<{
    method: 'get';
    version: 1;
    path: '/viewer-context';
    parameters: readonly [
        typeof ViewerTimezoneParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewerOrDevice, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof ViewerContextSchema, unknown>;
    };
}>;
//# sourceMappingURL=types.d.ts.map