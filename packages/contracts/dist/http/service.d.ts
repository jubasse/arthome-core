/**
 * What every microservice's internal API shares (D-121, `transport.md` §5.2): the identity of a call
 * between services, the internal token the BFF mints, which names the calling BFF and the end user,
 * verified by the service's guard; the error model and the envelope a service answers; the
 * conventions its resources follow; the rule naming the BFFs a route serves. A route that requires
 * the identity is internal, takes the deadline and the trace context on every call and the actor's
 * surface on every write, and answers `504 api.deadline_exceeded` when the instant is already past.
 */
import { z } from 'zod';
import { ApiErrorCode, SURFACES } from '@arthome/core';
import type { ErrorCode, InternalTokenIssuer } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { ErrorSchema } from '@arthome/core/schema';
import type { Identity, Requirement } from './access.js';
import type { CodedResponse, ErrorBody, ErrorModel } from './errors.js';
import type { Header, HeaderParameter, JsonResponse } from './index.js';
import type { ResourceConventions } from './resource.js';
export declare const DeadlineParameter: HeaderParameter<'x-arthome-deadline', z.ZodString, true>;
export declare const RelayedTraceparentParameter: HeaderParameter<'traceparent', z.ZodString>;
/**
 * Who calls, from the verified token: the BFF (`iss`), the account (`sub`), and the profile and the
 * device (`pro`, `did`) when the token names them. A service reads the caller here and never from a
 * body or a header: a body `profileId` or `deviceId` other than the principal's is refused
 * `403 api.forbidden`, and a route that reads the profile refuses a token naming none the same way.
 */
export declare const ServicePrincipalSchema: z.ZodObject<{
    callingService: z.ZodString;
    userId: z.ZodNullable<z.ZodString>;
    profileId: z.ZodOptional<z.ZodString>;
    deviceId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ActorSurfaceParameter: HeaderParameter<'x-arthome-actor-surface', VocabularyIn<typeof SURFACES>, true>;
export declare const service: Identity<'service', typeof ServicePrincipalSchema, never, readonly [typeof DeadlineParameter, typeof RelayedTraceparentParameter], readonly [typeof ActorSurfaceParameter]>;
/** The BFFs a route serves, by the token's issuer: any other caller is refused `403 api.forbidden`. */
export declare function callerService<const Issuers extends readonly [InternalTokenIssuer, ...InternalTokenIssuer[]]>(...issuers: Issuers): Requirement<'callerService', {
    readonly issuers: Issuers;
}, typeof ApiErrorCode.FORBIDDEN>;
export declare const RelayedIdempotencyKeyParameter: HeaderParameter<'Idempotency-Key', z.ZodString, true>;
export declare const ViewerCountryParameter: HeaderParameter<'x-arthome-viewer-country', z.ZodString, true>;
/** `transport.md` §5.5: a versioned record carries its `version` inside `data`, never at the root. */
export declare const ServiceEnvelopeMetaSchema: z.ZodObject<{
    servedAt: z.ZodString;
    validUntil: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$loose>;
export declare const ServiceErrorEnvelopeSchema: z.ZodObject<{
    error: typeof ErrorSchema;
    servedAt: z.ZodString;
}, z.core.$loose>;
declare const SchemaInvalidEnvelopeSchema: z.ZodType<ErrorBody<typeof ApiErrorCode.SCHEMA_INVALID>>;
export declare const ServiceBadRequestResponse: JsonResponse<typeof SchemaInvalidEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.SCHEMA_INVALID>;
export declare const ServiceUnauthorizedResponse: JsonResponse<typeof ServiceErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.UNAUTHENTICATED>;
export declare const ServiceForbiddenResponse: JsonResponse<typeof ServiceErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.FORBIDDEN>;
export declare const ServiceNotFoundResponse: JsonResponse<typeof ServiceErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.NOT_FOUND>;
export declare const ServiceConflictResponse: JsonResponse<typeof ServiceErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED>;
export declare const ServicePayloadTooLargeResponse: JsonResponse<typeof ServiceErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.PAYLOAD_TOO_LARGE>;
export declare const ServiceUnsupportedMediaTypeResponse: JsonResponse<typeof ServiceErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.UNSUPPORTED_MEDIA_TYPE>;
export declare const ServiceInternalErrorResponse: JsonResponse<typeof ServiceErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.INTERNAL>;
export declare const ServiceDeadlineExceededResponse: JsonResponse<typeof ServiceErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.DEADLINE_EXCEEDED>;
/**
 * What a service answers whatever it declares. Every code is allowed, since a BFF narrows what it
 * relays and a service does not; no `upstreams`, since a service calls no service (critical rule 1).
 */
export declare const serviceErrors: ErrorModel<ErrorCode>;
/**
 * The envelope services answer: `data` under the meta, a page's `items` and `page` at the root. A
 * service list relays its public operation's page, so the page's own shape is the list's to state.
 */
export declare const serviceConventions: {
    readonly meta?: z.output<typeof ServiceEnvelopeMetaSchema>;
    readonly item: ResourceConventions['item'];
    readonly page: ResourceConventions['page'];
    readonly listParameters: readonly [];
    readonly readParameters: readonly [];
    readonly readHeaders: Readonly<Record<string, Header>>;
    readonly writeParameters: readonly [typeof RelayedIdempotencyKeyParameter];
    readonly replayedHeader: Header;
    readonly itemExample: (data: unknown) => unknown;
    readonly pageExample: (data: readonly unknown[]) => unknown;
    readonly expectedVersion: z.ZodNumber;
};
export {};
//# sourceMappingURL=service.d.ts.map