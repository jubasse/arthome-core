import { z } from 'zod';
import { ApiErrorCode, Surface } from '@arthome/core';
import type { ErrorCode } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { StudioEnvelopeMetaSchema, StudioErrorEnvelopeSchema } from '../envelope/index.js';
import type { AccessorOf, ErrorModel, Header, Identity, Paging, HeaderParameter, JsonResponse, PathParameter, QueryParameter, RecentAuth, Response, ResourceConventions, RouteBuilder, CodedResponse } from '../http/index.js';
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
export declare const RightsVersionHeader: Header;
export declare const IdempotencyReplayedHeader: Header;
export declare const BadRequestResponse: JsonResponse<typeof StudioErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.PERIOD_FILTER_REQUIRED>;
export declare const UnauthorizedResponse: JsonResponse<typeof StudioErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.UNAUTHENTICATED>;
export declare const CsrfRefusedResponse: JsonResponse<typeof StudioErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.FORBIDDEN>;
export declare const ForbiddenResponse: JsonResponse<typeof StudioErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.RIGHTS_VERSION_STALE>;
export declare const NotFoundResponse: JsonResponse<typeof StudioErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.NOT_FOUND>;
export declare const ConflictResponse: JsonResponse<typeof StudioErrorEnvelopeSchema>;
export declare const GoneResponse: JsonResponse<typeof StudioErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.CURSOR_TOO_OLD>;
export declare const TooManyRequestsResponse: JsonResponse<typeof StudioErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.RATE_LIMITED>;
export declare const UnavailableResponse: JsonResponse<typeof StudioErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.SERVICE_UNAVAILABLE>;
export declare const PayloadTooLargeResponse: JsonResponse<typeof StudioErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.PAYLOAD_TOO_LARGE>;
export declare const UnsupportedMediaTypeResponse: JsonResponse<typeof StudioErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.UNSUPPORTED_MEDIA_TYPE>;
export declare const InternalErrorResponse: JsonResponse<typeof StudioErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.INTERNAL>;
export declare const BadGatewayResponse: JsonResponse<typeof StudioErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.UPSTREAM_UNAVAILABLE>;
export declare const GatewayTimeoutResponse: JsonResponse<typeof StudioErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.UPSTREAM_TIMEOUT>;
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
    readonly replayedHeader: Header;
    readonly itemExample: (data: unknown) => unknown;
    readonly pageExample: (data: readonly unknown[]) => unknown;
    readonly expectedVersion: z.ZodNumber;
    readonly paging: Paging;
    readonly paginations: {
        readonly pages: {
            readonly parameters: (paging: {
                readonly maxPageSize: number;
            }) => readonly [typeof PageParameter, QueryParameter<'pageSize', z.ZodDefault<z.ZodInt>>];
            readonly page: ResourceConventions['page'];
        };
        readonly cursor: {
            readonly parameters: (paging: {
                readonly maxLimit: number;
            }) => readonly [typeof CursorParameter, QueryParameter<'limit', z.ZodDefault<z.ZodInt>>];
            readonly page: ResourceConventions['page'];
        };
    };
};
/**
 * The codes a studio response stands for. A 409 is the business refusal whose `code` says which, so
 * it already covers the idempotency refusals and a stale version.
 */
export declare const studioErrors: ErrorModel<ErrorCode>;
export declare const OperatorPrincipalSchema: z.ZodObject<{
    personId: z.ZodString;
    rightsVersion: z.ZodNumber;
    rights: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
/** A signed-in channel member, by session cookie (a write carries its CSRF token) or bearer token; a write carries the rights version it holds. */
export declare const operator: Identity<'operator', typeof OperatorPrincipalSchema, typeof ApiErrorCode.RIGHTS_VERSION_STALE | typeof ApiErrorCode.FORBIDDEN, readonly [], readonly [typeof IfRightsVersionParameter]>;
/** The commands a re-authentication token is minted for, one per token. */
export declare const REAUTH_INTENTS: readonly ["reveal_stream_key", "rotate_stream_key", "transfer_ownership", "delete_channel", "change_bank_details"];
export declare const ReauthIntent: AccessorOf<typeof REAUTH_INTENTS>;
/** `requires: [recentAuth({ intent: ReauthIntent.DELETE_CHANNEL })]`: a token minted for another command is refused. */
export declare const recentAuth: RecentAuth<typeof REAUTH_INTENTS>;
export declare const studioV1: RouteBuilder<1, readonly [], Record<never, never>, ErrorCode, typeof studioConventions>;
export {};
//# sourceMappingURL=components.d.ts.map