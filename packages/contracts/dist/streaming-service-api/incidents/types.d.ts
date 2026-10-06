/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */
import type { ApiErrorCode, DomainErrorCode } from '@arthome/core';
import type { IdentifiedAccess, ItemResponse, Route, service, serviceConventions } from '../../http/index.js';
import type { ActorSurfaceParameter, DeadlineParameter, RelayedIdempotencyKeyParameter, RelayedTraceparentParameter } from '../../http/service.js';
import type { IncidentIdParameter, IncidentResolutionSchema } from '../../studio-api/incidents/schemas.js';
export type ResolveIncidentRoute = Route<{
    method: 'post';
    version: 1;
    path: '/incidents/{incidentId}/resolve';
    parameters: readonly [
        typeof IncidentIdParameter,
        typeof RelayedIdempotencyKeyParameter,
        typeof DeadlineParameter,
        typeof RelayedTraceparentParameter,
        typeof ActorSurfaceParameter
    ];
    access: IdentifiedAccess<typeof service, false>;
    responses: {
        200: ItemResponse<typeof serviceConventions, typeof IncidentResolutionSchema, unknown>;
    };
    errorCodes: {
        403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED | typeof DomainErrorCode.STATE_CONFLICT)[];
    };
}>;
//# sourceMappingURL=types.d.ts.map