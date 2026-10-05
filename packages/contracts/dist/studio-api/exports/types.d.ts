/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */
import type { ApiErrorCode } from '@arthome/core';
import type { IdentifiedAccess, ItemResponse, Route } from '../../http/index.js';
import type { ExportJobSchema } from '../../studio-money/index.js';
import type { SurfaceParameter, TraceparentParameter, operator, studioConventions } from '../components.js';
import type { ExportIdParameter } from './schemas.js';
export type GetChannelExportRoute = Route<{
    method: 'get';
    version: 1;
    path: '/exports/{exportId}';
    parameters: readonly [
        typeof ExportIdParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof operator, false>;
    responses: {
        200: ItemResponse<typeof studioConventions, typeof ExportJobSchema, unknown>;
    };
    errorCodes: {
        403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    };
}>;
//# sourceMappingURL=types.d.ts.map