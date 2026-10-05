/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */
import type { ApiErrorCode } from '@arthome/core';
import type { CategoryScreenSchema } from '../../catalog/index.js';
import type { IdentifiedAccess, ItemResponse, Route } from '../../http/index.js';
import type { CategoryIdParameter, CursorParameter, LimitParameter, SurfaceParameter, TraceparentParameter, storefrontConventions, viewer } from '../components.js';
import type { CategoryFiltersParameter, CategoryListSchema, CategoryScreenSectionParameter, CategorySortParameter, SubGenreIdParameter } from './schemas.js';
export type ListCategoriesRoute = Route<{
    method: 'get';
    version: 1;
    path: '/categories';
    parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
    access: IdentifiedAccess<typeof viewer, true>;
    responses: {
        200: {
            readonly description: 'The disciplines.';
            readonly content: {
                readonly 'application/json': {
                    readonly schema: typeof CategoryListSchema;
                };
            };
        };
    };
}>;
export type GetCategoryScreenRoute = Route<{
    method: 'get';
    version: 1;
    path: '/categories/{categoryId}';
    parameters: readonly [
        typeof CategoryIdParameter,
        typeof CategoryScreenSectionParameter,
        typeof CursorParameter,
        typeof LimitParameter,
        typeof SubGenreIdParameter,
        typeof CategoryFiltersParameter,
        typeof CategorySortParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, true>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof CategoryScreenSchema, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    };
}>;
//# sourceMappingURL=types.d.ts.map