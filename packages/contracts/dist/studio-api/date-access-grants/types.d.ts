/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */
import type { ApiErrorCode, DomainErrorCode } from '@arthome/core';
import type { ExpectedVersionQuery, IdentifiedAccess, ItemResponse, Route } from '../../http/index.js';
import type { IdempotencyKeyParameter, IfRightsVersionParameter, SurfaceParameter, TraceparentParameter, operator, studioConventions } from '../components.js';
import type { DateAccessGrantIdParameter, DateAccessRevocationSchema } from './schemas.js';
export type RevokeDateAccessRoute = Route<{
    method: 'delete';
    version: 1;
    path: '/date-access-grants/{grantId}';
    parameters: readonly [
        typeof DateAccessGrantIdParameter,
        typeof IdempotencyKeyParameter,
        ExpectedVersionQuery,
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof IfRightsVersionParameter
    ];
    access: IdentifiedAccess<typeof operator, false>;
    responses: {
        200: ItemResponse<typeof studioConventions, typeof DateAccessRevocationSchema, unknown>;
    };
    errorCodes: {
        403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED | typeof DomainErrorCode.STATE_CONFLICT)[];
    };
}>;
//# sourceMappingURL=types.d.ts.map