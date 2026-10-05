/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */
import type { ApiErrorCode } from '@arthome/core';
import type { ArtistDetailSchema, ArtistSummarySchema } from '../../catalog/index.js';
import type { IdentifiedAccess, ItemResponse, PageResponse, Route } from '../../http/index.js';
import type { ArtistIdParameter, CursorDirectionParameter, CursorParameter, LimitParameter, SurfaceParameter, TraceparentParameter, storefrontConventions, viewer } from '../components.js';
import type { ArtistCategoryParameter, ArtistLiveOnlyParameter, ArtistSortParameter } from './schemas.js';
export type ListArtistsRoute = Route<{
    method: 'get';
    version: 1;
    path: '/artists';
    parameters: readonly [
        typeof CursorParameter,
        typeof LimitParameter,
        typeof CursorDirectionParameter,
        typeof ArtistCategoryParameter,
        typeof ArtistSortParameter,
        typeof ArtistLiveOnlyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, true>;
    responses: {
        200: PageResponse<typeof storefrontConventions, typeof ArtistSummarySchema>;
    };
    errorCodes: {
        400: readonly (typeof ApiErrorCode.SCHEMA_INVALID)[];
    };
}>;
export type GetArtistDetailRoute = Route<{
    method: 'get';
    version: 1;
    path: '/artists/{artistId}';
    parameters: readonly [
        typeof ArtistIdParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, true>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof ArtistDetailSchema, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    };
}>;
//# sourceMappingURL=types.d.ts.map