import { z } from 'zod';
import { Surface } from '@arthome/core';
import type { ErrorCode } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { StudioEnvelopeMetaSchema, StudioErrorEnvelopeSchema } from '../envelope/index.js';
import type { AccessorOf, ErrorModel, Header, HeaderParameter, JsonResponse, PathParameter, QueryParameter, Response, ResourceConventions, RouteBuilder } from '../http/index.js';
declare const SURFACE: readonly [typeof Surface.STUDIO_WEB, typeof Surface.STUDIO_MOBILE];
declare const SORT_DIR: readonly ["asc", "desc"];
declare const STUDIO_TAGS: readonly ["bootstrap", "agenda", "publication", "ticketing", "run", "moderation", "crew", "payouts", "channel"];
/** The tags this document groups its operations by. */
export declare const StudioTag: AccessorOf<typeof STUDIO_TAGS>;
export declare const TraceparentParameter: HeaderParameter<'traceparent', z.ZodString>;
export declare const SurfaceParameter: HeaderParameter<'X-Arthome-Surface', VocabularyIn<typeof SURFACE>, true>;
export declare const IdempotencyKeyParameter: HeaderParameter<'Idempotency-Key', z.ZodString, true>;
export declare const IfRightsVersionParameter: HeaderParameter<'If-Rights-Version', z.ZodNumber>;
export declare const ChannelIdParameter: PathParameter<'channelId', z.ZodString>;
export declare const DateIdParameter: PathParameter<'dateId', z.ZodString>;
export declare const PageParameter: QueryParameter<'page', z.ZodDefault<z.ZodInt>>;
export declare const PageSizeParameter: QueryParameter<'pageSize', z.ZodDefault<z.ZodInt>>;
export declare const SortByParameter: QueryParameter<'sortBy', z.ZodString>;
export declare const SortDirParameter: QueryParameter<'sortDir', z.ZodDefault<VocabularyIn<typeof SORT_DIR>>>;
export declare const CursorParameter: QueryParameter<'cursor', z.ZodString>;
export declare const LimitParameter: QueryParameter<'limit', z.ZodDefault<z.ZodInt>>;
export declare const ServedAtHeader: Header;
export declare const RightsVersionHeader: Header;
export declare const IdempotencyReplayedHeader: Header;
export declare const BadRequestResponse: JsonResponse<typeof StudioErrorEnvelopeSchema>;
export declare const UnauthorizedResponse: JsonResponse<typeof StudioErrorEnvelopeSchema>;
export declare const ForbiddenResponse: JsonResponse<typeof StudioErrorEnvelopeSchema>;
export declare const NotFoundResponse: JsonResponse<typeof StudioErrorEnvelopeSchema>;
export declare const ConflictResponse: JsonResponse<typeof StudioErrorEnvelopeSchema>;
export declare const GoneResponse: JsonResponse<typeof StudioErrorEnvelopeSchema>;
export declare const TooManyRequestsResponse: JsonResponse<typeof StudioErrorEnvelopeSchema>;
export declare const UnavailableResponse: JsonResponse<typeof StudioErrorEnvelopeSchema>;
declare const IfNoneMatchParameter: HeaderParameter<'If-None-Match', z.ZodString>;
declare const OWN_LIST_PARAMETERS: readonly [
    typeof PageParameter,
    typeof PageSizeParameter,
    typeof SortByParameter,
    typeof SortDirParameter
];
/** What every studio resource is served and written like: see `ResourceConventions`. */
export declare const studioConventions: {
    readonly meta?: z.output<typeof StudioEnvelopeMetaSchema>;
    readonly item: ResourceConventions['item'];
    readonly page: ResourceConventions['page'];
    readonly listParameters: typeof OWN_LIST_PARAMETERS;
    readonly readParameters: readonly [typeof IfNoneMatchParameter];
    readonly readHeaders: {
        readonly ETag: Header;
    };
    readonly notModified: Response;
    readonly writeParameters: readonly [typeof IdempotencyKeyParameter];
    readonly expectedVersion: z.ZodNumber;
};
/**
 * The codes a studio response stands for. A 409 is the business refusal whose `code` says which, so
 * it already covers the idempotency refusals and a stale version.
 */
export declare const studioErrors: ErrorModel<ErrorCode>;
export declare const studioV1: RouteBuilder<1, readonly [], Record<never, never>, ErrorCode, typeof studioConventions>;
export {};
//# sourceMappingURL=components.d.ts.map