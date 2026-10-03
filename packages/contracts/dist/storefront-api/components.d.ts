import { z } from 'zod';
import { Surface } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { StorefrontErrorEnvelopeSchema } from '../envelope/index.js';
import type { AccessorOf, Header, HeaderParameter, JsonResponse, PathParameter, QueryParameter, RouteBuilder, SecurityRequirement } from '../http/index.js';
declare const SURFACE: readonly [
    typeof Surface.STOREFRONT_WEB,
    typeof Surface.STOREFRONT_MOBILE,
    typeof Surface.STOREFRONT_TV
];
declare const CURSOR_DIRECTION: readonly ["forward", "backward"];
declare const STOREFRONT_TAGS: readonly ["bootstrap", "discovery", "date", "commerce", "playback", "chat", "pairing", "account"];
/**
 * **Public read.** A complete absence of authentication is a NOMINAL case, not an error: this
 * read is the indexable face of the product, and a search engine's crawler has neither cookie,
 * nor bearer token, nor any way of minting one. Guest mode takes the same path. See "Public read
 * and identified read" at the top of the document.
 */
export declare const PublicReadSecurity: readonly SecurityRequirement[];
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
export declare const CacheControlPublicHeader: Header;
export declare const VaryAuthHeader: Header;
export declare const BadRequestResponse: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
export declare const UnauthorizedResponse: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
export declare const CsrfRefusedResponse: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
export declare const ForbiddenResponse: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
export declare const NotFoundResponse: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
export declare const ConflictResponse: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
export declare const GoneResponse: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
export declare const TooManyRequestsResponse: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
export declare const UnavailableResponse: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
export declare const storefrontV1: RouteBuilder<1, readonly [], Record<never, never>>;
export {};
//# sourceMappingURL=components.d.ts.map