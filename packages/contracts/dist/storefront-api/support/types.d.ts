/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */
import type { ApiErrorCode } from '@arthome/core';
import type { IdentifiedAccess, ItemResponse, JsonRequestBody, Route } from '../../http/index.js';
import type { IdempotencyKeyParameter, SurfaceParameter, TraceparentParameter, storefrontConventions, viewer } from '../components.js';
import type { ContactSupportBodySchema, SupportRequestOpeningSchema } from './schemas.js';
export type ContactSupportRoute = Route<{
    method: 'post';
    version: 1;
    path: '/support/requests';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<typeof ContactSupportBodySchema, true>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        202: ItemResponse<typeof storefrontConventions, typeof SupportRequestOpeningSchema, unknown>;
    };
    errorCodes: {
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
//# sourceMappingURL=types.d.ts.map