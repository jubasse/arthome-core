import { z } from 'zod';
import { ApiErrorCode, ChatErrorCode, OrderErrorCode, Surface } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { StorefrontEnvelopeMetaSchema, StorefrontErrorEnvelopeSchema } from '../envelope/index.js';
import type { StorefrontRelayedCode } from '../envelope/index.js';
import type { AccessorOf, CachePolicy, ErrorBody, ErrorModel, Freshness, Header, Identity, Paging, HeaderParameter, JsonResponse, PathParameter, QueryParameter, Response, ResourceConventions, RouteBuilder, CodedResponse } from '../http/index.js';
declare const SURFACE: readonly [
    typeof Surface.STOREFRONT_WEB,
    typeof Surface.STOREFRONT_MOBILE,
    typeof Surface.STOREFRONT_TV
];
declare const CURSOR_DIRECTION: readonly ["forward", "backward"];
declare const STOREFRONT_TAGS: readonly ["bootstrap", "discovery", "date", "commerce", "playback", "chat", "pairing", "account"];
/** The tags this document groups its operations by. */
export declare const StorefrontTag: AccessorOf<typeof STOREFRONT_TAGS>;
export declare const TraceparentParameter: HeaderParameter<'traceparent', z.ZodString>;
export declare const SurfaceParameter: HeaderParameter<'X-Arthome-Surface', VocabularyIn<typeof SURFACE>, true>;
export declare const ViewerTimezoneParameter: HeaderParameter<'X-Arthome-Timezone', z.ZodString>;
export declare const IdempotencyKeyParameter: HeaderParameter<'Idempotency-Key', z.ZodString, true>;
export declare const AdmissionTokenParameter: HeaderParameter<'X-Arthome-Admission-Token', z.ZodString>;
export declare const LateEntryAcknowledgedParameter: HeaderParameter<'X-Arthome-Late-Entry-Acknowledged', z.ZodLiteral<'true'>>;
export declare const CursorParameter: QueryParameter<'cursor', z.ZodString>;
export declare const CursorDirectionParameter: QueryParameter<'direction', z.ZodDefault<VocabularyIn<typeof CURSOR_DIRECTION>>>;
export declare const LimitParameter: QueryParameter<'limit', z.ZodDefault<z.ZodInt>>;
export declare const DateIdParameter: PathParameter<'dateId', z.ZodString>;
export declare const ArtistIdParameter: PathParameter<'artistId', z.ZodString>;
export declare const CategoryIdParameter: PathParameter<'categoryId', z.ZodString>;
export declare const ServedAtHeader: Header;
export declare const IdempotencyReplayedHeader: Header;
export declare const RetryAfterMsHeader: Header;
/** The freshness of a public read: `public` for an anonymous caller, varying on every credential and the surface. */
export declare function publicRead(freshness: Freshness, options?: {
    readonly etag?: boolean;
}): CachePolicy;
/** `api.schema_invalid`'s envelope, so the document says what a refused field carries. */
declare const SchemaInvalidEnvelopeSchema: z.ZodType<ErrorBody<typeof ApiErrorCode.SCHEMA_INVALID>>;
export declare const BadRequestResponse: JsonResponse<typeof SchemaInvalidEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.SCHEMA_INVALID>;
export declare const UnauthorizedResponse: JsonResponse<typeof StorefrontErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.UNAUTHENTICATED>;
export declare const CsrfRefusedResponse: JsonResponse<typeof StorefrontErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.FORBIDDEN>;
export declare const ForbiddenResponse: JsonResponse<typeof StorefrontErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.FORBIDDEN>;
export declare const NotFoundResponse: JsonResponse<typeof StorefrontErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.NOT_FOUND>;
export declare const ConflictResponse: JsonResponse<typeof StorefrontErrorEnvelopeSchema> & CodedResponse<typeof OrderErrorCode.PRICE_STALE>;
export declare const GoneResponse: JsonResponse<typeof StorefrontErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.CURSOR_TOO_OLD>;
export declare const TooManyRequestsResponse: JsonResponse<typeof StorefrontErrorEnvelopeSchema> & CodedResponse<typeof ChatErrorCode.RATE_LIMITED>;
export declare const UnavailableResponse: JsonResponse<typeof StorefrontErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.SERVICE_UNAVAILABLE>;
export declare const PayloadTooLargeResponse: JsonResponse<typeof StorefrontErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.PAYLOAD_TOO_LARGE>;
export declare const UnsupportedMediaTypeResponse: JsonResponse<typeof StorefrontErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.UNSUPPORTED_MEDIA_TYPE>;
export declare const InternalErrorResponse: JsonResponse<typeof StorefrontErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.INTERNAL>;
export declare const BadGatewayResponse: JsonResponse<typeof StorefrontErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.UPSTREAM_UNAVAILABLE>;
export declare const GatewayTimeoutResponse: JsonResponse<typeof StorefrontErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.UPSTREAM_TIMEOUT>;
declare const IfNoneMatchParameter: HeaderParameter<'If-None-Match', z.ZodString>;
declare const OWN_LIST_PARAMETERS: readonly [typeof CursorParameter, typeof LimitParameter];
/** What every storefront resource is served and written like: see `ResourceConventions`. */
export declare const storefrontConventions: {
    readonly meta?: z.output<typeof StorefrontEnvelopeMetaSchema>;
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
        readonly cursor: {
            readonly parameters: (paging: {
                readonly maxLimit: number;
            }) => readonly [typeof CursorParameter, QueryParameter<'limit', z.ZodDefault<z.ZodInt>>];
            readonly page: ResourceConventions['page'];
        };
    };
};
/**
 * The codes a storefront response stands for. A 409 is the business refusal whose `code` says
 * which, so it already covers the idempotency refusals.
 */
export declare const storefrontErrors: ErrorModel<StorefrontRelayedCode>;
export declare const ViewerPrincipalSchema: z.ZodObject<{
    accountId: z.ZodString;
    deviceId: z.ZodString;
}, z.core.$strip>;
export declare const DevicePrincipalSchema: z.ZodObject<{
    deviceId: z.ZodString;
}, z.core.$strip>;
/** A signed-in viewer, by session cookie (a write carries its CSRF token) or bearer token. */
export declare const viewer: Identity<'viewer', typeof ViewerPrincipalSchema, typeof ApiErrorCode.FORBIDDEN, readonly [], readonly []>;
/**
 * A signed-in viewer, or a device that holds only its device token: the bootstrap is read and a
 * pairing driven before any session. Either credential reads and writes, and the principal says
 * which one called.
 */
export declare const viewerOrDevice: Identity<'viewer_or_device', z.ZodUnion<readonly [typeof ViewerPrincipalSchema, typeof DevicePrincipalSchema]>, typeof ApiErrorCode.FORBIDDEN, readonly [], readonly []>;
/** The television, paired to an account: it holds a device token and no session. */
export declare const device: Identity<'paired_device', typeof DevicePrincipalSchema, never, readonly [], readonly []>;
export declare const storefrontV1: RouteBuilder<1, readonly [], Record<never, never>, StorefrontRelayedCode, typeof storefrontConventions>;
export {};
//# sourceMappingURL=components.d.ts.map