/**
 * What every microservice's internal API shares (D-121, `transport.md` §5.2): the identity of a call
 * between services, the internal token the BFF mints, which names the calling BFF and the end user,
 * verified by the service's guard; the error model and the envelope a service answers; the
 * conventions its resources follow; the rule naming the BFFs a route serves. A route that requires
 * the identity is internal, takes the deadline and the trace context on every call, and answers
 * `504 api.deadline_exceeded` when the instant is already past.
 */

import { z } from 'zod';

import { ApiErrorCode } from '@arthome/core';
import type { ErrorCode, InternalTokenIssuer } from '@arthome/core';
import {
  CountryCodeSchema,
  ERROR_PARAMS,
  ErrorSchema,
  InstantOut,
  errorParamsSchemaOf,
  int64,
  uuidIn,
} from '@arthome/core/schema';

import { identity, requirement } from './access.js';
import type { Identity, Requirement } from './access.js';
import { defineErrorModel, errorResponse } from './errors.js';
import type { CodedResponse, ErrorBody, ErrorModel } from './errors.js';
import type { Header, HeaderParameter, JsonResponse } from './index.js';
import { IDEMPOTENCY_REPLAYED_HEADER } from './policy.js';
import type { ResourceConventions } from './resource.js';

export const DeadlineParameter: HeaderParameter<'x-arthome-deadline', z.ZodString, true> = {
  name: 'x-arthome-deadline',
  in: 'header',
  required: true,
  description:
    'The RFC 3339 UTC instant after which the caller no longer waits. A service handed a past instant does nothing.',
  schema: z.string().meta({ format: 'date-time' }),
};

export const RelayedTraceparentParameter: HeaderParameter<'traceparent', z.ZodString> = {
  name: 'traceparent',
  in: 'header',
  required: false,
  description:
    'W3C trace context, created at the BFF when the surface sent none, and propagated unmodified\n(`transport.md` §5.2): it is the one the service injects into `outbox_event.tracecontext` at\nwrite time. A malformed one is never refused: a broken trace is an observability fault.\n',
  schema: z.string(),
};

/**
 * Who calls, from the verified token: the BFF (`iss`), the account (`sub`), and the profile and the
 * device (`pro`, `did`) when the token names them. A service reads the caller here and never from a
 * body or a header: a body `profileId` or `deviceId` other than the principal's is refused
 * `403 api.forbidden`.
 */
export const ServicePrincipalSchema: z.ZodObject<
  {
    callingService: z.ZodString;
    userId: z.ZodNullable<z.ZodString>;
    profileId: z.ZodOptional<z.ZodString>;
    deviceId: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
> = z.object({
  callingService: z.string(),
  userId: z.string().nullable(),
  profileId: z.string().optional(),
  deviceId: z.string().optional(),
});

export const service: Identity<
  'service',
  typeof ServicePrincipalSchema,
  never,
  readonly [typeof DeadlineParameter, typeof RelayedTraceparentParameter],
  readonly []
> = identity('service', {
  schemes: { read: [{ internalToken: [] }], write: [{ internalToken: [] }] },
  principal: ServicePrincipalSchema,
  parameters: [DeadlineParameter, RelayedTraceparentParameter],
  internal: true,
});

/** The BFFs a route serves, by the token's issuer: any other caller is refused `403 api.forbidden`. */
export function callerService<
  const Issuers extends readonly [InternalTokenIssuer, ...InternalTokenIssuer[]],
>(
  ...issuers: Issuers
): Requirement<'callerService', { readonly issuers: Issuers }, typeof ApiErrorCode.FORBIDDEN> {
  return requirement('callerService', { params: { issuers }, errors: [ApiErrorCode.FORBIDDEN] });
}

export const RelayedIdempotencyKeyParameter: HeaderParameter<'Idempotency-Key', z.ZodString, true> =
  {
    name: 'Idempotency-Key',
    in: 'header',
    required: true,
    description:
      "The surface's key, relayed as is by the BFF (`transport.md` §5.2, §5.4): a key the BFF\nregenerated would protect nothing, since the surface is what replays. Scoped to the account the\ntoken names. A replayed key answers the first attempt's response, verbatim.\n",
    schema: uuidIn().meta({ examples: ['019928f4-1b6c-7c3a-9f2e-6a1d0c4b8e77'] }),
  };

export const ViewerCountryParameter: HeaderParameter<
  'x-arthome-viewer-country',
  z.ZodString,
  true
> = {
  name: 'x-arthome-viewer-country',
  in: 'header',
  required: true,
  description:
    "The viewer's country, ISO 3166-1 alpha-2, set by the BFF from the edge on every call that\ndecides a watch verdict. It is resolved at every opening, never projected\n(`adr-stream-entitlement.md` §5): it changes between two reads.\n",
  schema: CountryCodeSchema.meta({ examples: ['FR'] }),
};

/** `transport.md` §5.5: a versioned record carries its `version` inside `data`, never at the root. */
export const ServiceEnvelopeMetaSchema: z.ZodObject<
  { servedAt: z.ZodString; validUntil: z.ZodOptional<z.ZodNullable<z.ZodString>> },
  z.core.$loose
> = z.looseObject({
  servedAt: InstantOut.meta({ format: 'date-time' }),
  validUntil: InstantOut.nullable().meta({ format: 'date-time' }).optional(),
});

export const ServiceErrorEnvelopeSchema: z.ZodObject<
  { error: typeof ErrorSchema; servedAt: z.ZodString },
  z.core.$loose
> = z.looseObject({
  error: ErrorSchema,
  servedAt: InstantOut.meta({ format: 'date-time', pattern: undefined }),
});

const SchemaInvalidEnvelopeSchema: z.ZodType<ErrorBody<typeof ApiErrorCode.SCHEMA_INVALID>> =
  ServiceErrorEnvelopeSchema.extend({
    error: ErrorSchema.extend({
      code: z.literal(ApiErrorCode.SCHEMA_INVALID),
      params: ERROR_PARAMS[ApiErrorCode.SCHEMA_INVALID],
    }),
  });

export const ServiceBadRequestResponse: JsonResponse<typeof SchemaInvalidEnvelopeSchema> &
  CodedResponse<typeof ApiErrorCode.SCHEMA_INVALID> = errorResponse(SchemaInvalidEnvelopeSchema, {
  description: 'Refused by shape validation, a header included.',
  code: ApiErrorCode.SCHEMA_INVALID,
});

export const ServiceUnauthorizedResponse: JsonResponse<typeof ServiceErrorEnvelopeSchema> &
  CodedResponse<typeof ApiErrorCode.UNAUTHENTICATED> = errorResponse(ServiceErrorEnvelopeSchema, {
  description:
    'No internal token, or one refused: unsigned, expired, or minted for another service.',
  code: ApiErrorCode.UNAUTHENTICATED,
});

export const ServiceForbiddenResponse: JsonResponse<typeof ServiceErrorEnvelopeSchema> &
  CodedResponse<typeof ApiErrorCode.FORBIDDEN> = errorResponse(ServiceErrorEnvelopeSchema, {
  description:
    'A BFF the route does not serve, or a caller the loaded record refuses: the service authorises for itself.',
  code: ApiErrorCode.FORBIDDEN,
});

export const ServiceNotFoundResponse: JsonResponse<typeof ServiceErrorEnvelopeSchema> &
  CodedResponse<typeof ApiErrorCode.NOT_FOUND> = errorResponse(ServiceErrorEnvelopeSchema, {
  description: "Unknown record, or one that is not the caller's.",
  code: ApiErrorCode.NOT_FOUND,
});

export const ServiceConflictResponse: JsonResponse<typeof ServiceErrorEnvelopeSchema> &
  CodedResponse<typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED> = errorResponse(
  ServiceErrorEnvelopeSchema,
  {
    description: 'Refused by the state of the record or by a reused key: the `code` says which.',
    code: ApiErrorCode.IDEMPOTENCY_KEY_REUSED,
  },
);

export const ServicePayloadTooLargeResponse: JsonResponse<typeof ServiceErrorEnvelopeSchema> &
  CodedResponse<typeof ApiErrorCode.PAYLOAD_TOO_LARGE> = errorResponse(ServiceErrorEnvelopeSchema, {
  description: 'The body is over the ceiling of the route.',
  code: ApiErrorCode.PAYLOAD_TOO_LARGE,
});

export const ServiceUnsupportedMediaTypeResponse: JsonResponse<typeof ServiceErrorEnvelopeSchema> &
  CodedResponse<typeof ApiErrorCode.UNSUPPORTED_MEDIA_TYPE> = errorResponse(
  ServiceErrorEnvelopeSchema,
  {
    description: 'The body is not `application/json`.',
    code: ApiErrorCode.UNSUPPORTED_MEDIA_TYPE,
  },
);

export const ServiceInternalErrorResponse: JsonResponse<typeof ServiceErrorEnvelopeSchema> &
  CodedResponse<typeof ApiErrorCode.INTERNAL> = errorResponse(ServiceErrorEnvelopeSchema, {
  description:
    'A fault of the service. The BFF answers its surface `502 api.upstream_unavailable`.',
  code: ApiErrorCode.INTERNAL,
});

export const ServiceDeadlineExceededResponse: JsonResponse<typeof ServiceErrorEnvelopeSchema> &
  CodedResponse<typeof ApiErrorCode.DEADLINE_EXCEEDED> = errorResponse(ServiceErrorEnvelopeSchema, {
  description: 'The deadline had passed: the service did nothing (`transport.md` §5.3).',
  code: ApiErrorCode.DEADLINE_EXCEEDED,
});

/**
 * What a service answers whatever it declares. Every code is allowed, since a BFF narrows what it
 * relays and a service does not; no `upstreams`, since a service calls no service (critical rule 1).
 */
export const serviceErrors: ErrorModel<ErrorCode> = defineErrorModel({
  standard: {
    400: { response: ServiceBadRequestResponse, codes: [ApiErrorCode.SCHEMA_INVALID] },
    401: {
      response: ServiceUnauthorizedResponse,
      codes: [ApiErrorCode.UNAUTHENTICATED, ApiErrorCode.TOKEN_EXPIRED],
    },
    403: { response: ServiceForbiddenResponse, codes: [ApiErrorCode.FORBIDDEN] },
    404: { response: ServiceNotFoundResponse, codes: [ApiErrorCode.NOT_FOUND] },
    409: {
      response: ServiceConflictResponse,
      codes: [ApiErrorCode.IDEMPOTENCY_KEY_REUSED, ApiErrorCode.IDEMPOTENCY_IN_FLIGHT],
    },
    413: { response: ServicePayloadTooLargeResponse, codes: [ApiErrorCode.PAYLOAD_TOO_LARGE] },
    415: {
      response: ServiceUnsupportedMediaTypeResponse,
      codes: [ApiErrorCode.UNSUPPORTED_MEDIA_TYPE],
    },
    500: { response: ServiceInternalErrorResponse, codes: [ApiErrorCode.INTERNAL] },
    504: { response: ServiceDeadlineExceededResponse, codes: [ApiErrorCode.DEADLINE_EXCEEDED] },
  },
  envelopeOf: (code) =>
    ServiceErrorEnvelopeSchema.extend({
      error: ErrorSchema.extend({
        code: z.literal(code),
        params: errorParamsSchemaOf(code as ErrorCode),
      }),
    }),
});

const EXAMPLE_SERVED_AT = '2026-09-21T19:00:00.000Z';

/**
 * The envelope services answer: `data` under the meta, a page's `items` and `page` at the root. A
 * service list relays its public operation's page, so the page's own shape is the list's to state.
 */
export const serviceConventions: {
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
} = {
  item: (data) => z.intersection(ServiceEnvelopeMetaSchema, z.looseObject({ data })),
  page: (data) =>
    z.intersection(
      ServiceEnvelopeMetaSchema,
      z.looseObject({ items: z.array(data), page: z.looseObject({}) }),
    ),
  listParameters: [],
  readParameters: [],
  readHeaders: {},
  writeParameters: [RelayedIdempotencyKeyParameter],
  replayedHeader: IDEMPOTENCY_REPLAYED_HEADER,
  itemExample: (data) => ({ servedAt: EXAMPLE_SERVED_AT, data }),
  pageExample: (items) => ({ servedAt: EXAMPLE_SERVED_AT, items, page: {} }),
  expectedVersion: int64(),
};
