/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */
import type { ApiErrorCode } from '@arthome/core';
import type { IdentifiedAccess, JsonRequestBody, PageResponse, Route } from '../../http/index.js';
import type { InboxEntrySchema } from '../../studio-desk/index.js';
import type { IdempotencyKeyParameter, IfRightsVersionParameter, PageParameter, PageSizeParameter, SurfaceParameter, TraceparentParameter, operator, studioConventions } from '../components.js';
import type { InboxReadAnswerSchema, MarkInboxReadBodySchema } from './schemas.js';
export type ListInboxRoute = Route<{
    method: 'get';
    version: 1;
    path: '/inbox';
    parameters: readonly [
        typeof PageParameter,
        typeof PageSizeParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof operator, false>;
    responses: {
        200: PageResponse<typeof studioConventions, typeof InboxEntrySchema>;
    };
    errorCodes: {
        400: readonly (typeof ApiErrorCode.SCHEMA_INVALID)[];
    };
}>;
export type MarkInboxReadRoute = Route<{
    method: 'post';
    version: 1;
    path: '/inbox';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof IfRightsVersionParameter
    ];
    requestBody: JsonRequestBody<typeof MarkInboxReadBodySchema, true>;
    access: IdentifiedAccess<typeof operator, false>;
    responses: {
        200: {
            readonly description: 'Up-to-date counters.';
            readonly content: {
                readonly 'application/json': {
                    readonly schema: typeof InboxReadAnswerSchema;
                };
            };
        };
    };
    errorCodes: {
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
//# sourceMappingURL=types.d.ts.map