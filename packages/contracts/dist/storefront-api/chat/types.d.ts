/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */
import type { ApiErrorCode } from '@arthome/core';
import type { IdentifiedAccess, JsonRequestBody, Response, Route } from '../../http/index.js';
import type { IdempotencyKeyParameter, SurfaceParameter, TraceparentParameter, viewer } from '../components.js';
import type { ChatMessageIdParameter, ReportChatMessageBodySchema } from './schemas.js';
export type ReportChatMessageRoute = Route<{
    method: 'post';
    version: 1;
    path: '/chat/messages/{messageId}/report';
    parameters: readonly [
        typeof ChatMessageIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<typeof ReportChatMessageBodySchema, true>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        202: Response;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
//# sourceMappingURL=types.d.ts.map