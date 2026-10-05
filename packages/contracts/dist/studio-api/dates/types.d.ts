/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */
import type { z } from 'zod';
import type { ApiErrorCode, CatalogErrorCode, DomainErrorCode, REPLAY_POLICIES } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import type { Deleted, ExpectedVersionQuery, IdentifiedAccess, ItemResponse, JsonRequestBody, Route } from '../../http/index.js';
import type { DateSheetSchema, PublicationSchema } from '../../studio-stage/index.js';
import type { DateIdParameter, IdempotencyKeyParameter, IfRightsVersionParameter, SurfaceParameter, TraceparentParameter, operator, studioConventions } from '../components.js';
import type { DateOutcomeDecisionSchema, DatePublicPaneSchema, DateReplayPaneSchema, DecideDateOutcomeBodySchema, DuplicateDateBodySchema, MoveDatePublicationStateBodySchema } from './schemas.js';
export type GetDateSheetRoute = Route<{
    method: 'get';
    version: 1;
    path: '/dates/{dateId}/sheet';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof operator, false>;
    responses: {
        200: ItemResponse<typeof studioConventions, typeof DateSheetSchema, unknown>;
    };
    errorCodes: {
        403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    };
}>;
export type GetDatePublicPaneRoute = Route<{
    method: 'get';
    version: 1;
    path: '/dates/{dateId}/panes/public';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof operator, false>;
    responses: {
        200: ItemResponse<typeof studioConventions, typeof DatePublicPaneSchema, unknown>;
    };
    errorCodes: {
        403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    };
}>;
export type GetDateReplayPaneRoute = Route<{
    method: 'get';
    version: 1;
    path: '/dates/{dateId}/panes/replay';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof operator, false>;
    responses: {
        200: ItemResponse<typeof studioConventions, typeof DateReplayPaneSchema, unknown>;
    };
    errorCodes: {
        403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    };
}>;
export type MoveDatePublicationStateRoute = Route<{
    method: 'post';
    version: 1;
    path: '/dates/{dateId}/publication/transitions';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof IfRightsVersionParameter
    ];
    requestBody: JsonRequestBody<typeof MoveDatePublicationStateBodySchema, true>;
    access: IdentifiedAccess<typeof operator, false>;
    responses: {
        200: ItemResponse<typeof studioConventions, typeof PublicationSchema, unknown>;
    };
    errorCodes: {
        403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED | typeof DomainErrorCode.PUBLICATION_CHECKLIST_INCOMPLETE | typeof DomainErrorCode.PUBLICATION_PROMISE_UNACKNOWLEDGED | typeof DomainErrorCode.PUBLICATION_TRANSITION_IRREVERSIBLE | typeof DomainErrorCode.STATE_CONFLICT)[];
    };
}>;
export type SetDateReplayPolicyRoute = Route<{
    method: 'put';
    version: 1;
    path: '/dates/{dateId}/replay-policy';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof IfRightsVersionParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        policy: VocabularyIn<typeof REPLAY_POLICIES>;
        windowHours: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    } & {
        readonly expectedVersion: z.ZodNumber;
    }, z.core.$strip>, true>;
    access: IdentifiedAccess<typeof operator, false>;
    responses: {
        200: ItemResponse<typeof studioConventions, typeof PublicationSchema, unknown>;
    };
    errorCodes: {
        403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED | typeof CatalogErrorCode.REPLAY_POLICY_FINAL | typeof DomainErrorCode.STATE_CONFLICT)[];
    };
}>;
export type DeleteDateRoute = Route<{
    method: 'delete';
    version: 1;
    path: '/dates/{dateId}';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        ExpectedVersionQuery,
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof IfRightsVersionParameter
    ];
    access: IdentifiedAccess<typeof operator, false>;
    responses: {
        200: ItemResponse<typeof studioConventions, typeof Deleted, unknown>;
    };
    errorCodes: {
        403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED | typeof CatalogErrorCode.DATE_HAS_SOLD_SEATS | typeof DomainErrorCode.STATE_CONFLICT)[];
    };
}>;
export type DuplicateDateRoute = Route<{
    method: 'post';
    version: 1;
    path: '/dates/{dateId}/duplicate';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof IfRightsVersionParameter
    ];
    requestBody: JsonRequestBody<typeof DuplicateDateBodySchema, true>;
    access: IdentifiedAccess<typeof operator, false>;
    responses: {
        201: ItemResponse<typeof studioConventions, typeof DateSheetSchema, unknown>;
    };
    errorCodes: {
        403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED | typeof DomainErrorCode.STATE_CONFLICT)[];
    };
}>;
export type DecideDateOutcomeRoute = Route<{
    method: 'post';
    version: 1;
    path: '/dates/{dateId}/outcome';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof IfRightsVersionParameter
    ];
    requestBody: JsonRequestBody<typeof DecideDateOutcomeBodySchema, true>;
    access: IdentifiedAccess<typeof operator, false>;
    responses: {
        200: ItemResponse<typeof studioConventions, typeof DateOutcomeDecisionSchema, unknown>;
    };
    errorCodes: {
        400: readonly (typeof CatalogErrorCode.RESCHEDULE_IN_PAST)[];
        403: readonly (typeof ApiErrorCode.FORBIDDEN | typeof CatalogErrorCode.OUTCOME_DECISION_FORBIDDEN)[];
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED | typeof CatalogErrorCode.DATE_ALREADY_ENDED | typeof CatalogErrorCode.DATE_ALREADY_STARTED | typeof CatalogErrorCode.DATE_NOT_PUBLIC | typeof CatalogErrorCode.DATE_NOT_STARTED | typeof CatalogErrorCode.OUTCOME_FINAL | typeof DomainErrorCode.STATE_CONFLICT)[];
    };
}>;
//# sourceMappingURL=types.d.ts.map