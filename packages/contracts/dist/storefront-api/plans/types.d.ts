/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */
import type { IdentifiedAccess, Route } from '../../http/index.js';
import type { SurfaceParameter, TraceparentParameter, viewer } from '../components.js';
import type { PlanListSchema } from './schemas.js';
export type ListPlansRoute = Route<{
    method: 'get';
    version: 1;
    path: '/plans';
    parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
    access: IdentifiedAccess<typeof viewer, true>;
    responses: {
        200: {
            readonly description: 'The plans.';
            readonly content: {
                readonly 'application/json': {
                    readonly schema: typeof PlanListSchema;
                };
            };
        };
    };
}>;
//# sourceMappingURL=types.d.ts.map