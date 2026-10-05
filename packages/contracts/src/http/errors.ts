/**
 * Error responses declared by code. A route says which codes a status can carry; the response that
 * documents it, and the client's type for it, are built from the code registry of `@arthome/core`:
 * one envelope per code, its `params` typed by `ERROR_PARAMS`, joined in a union discriminated on
 * `error.code`.
 */

import { z } from 'zod';

import { ApiErrorCode, type ErrorCode } from '@arthome/core';
import type { ErrorParamsRead } from '@arthome/core/schema';

import type { ErrorStatusMap } from './error-registry.js';
import { exampleOf, natureOf, statusOf } from './error-registry.js';
import type { JsonResponse, Response } from './index.js';

export type ErrorStatus =
  | 400
  | 401
  | 402
  | 403
  | 404
  | 409
  | 410
  | 412
  | 413
  | 415
  | 422
  | 423
  | 429
  | 500
  | 502
  | 503
  | 504;

/** The body of a failure carrying `C`: a union over the members of `C`, discriminated on `error.code`. */
export type ErrorBody<C extends string> = C extends string
  ? {
      readonly error: {
        readonly code: C;
        readonly params: C extends ErrorCode ? ErrorParamsRead<C> : never;
        readonly nature: string;
        readonly traceId: string;
      };
      readonly servedAt: string;
    }
  : never;

/** An error response whose body is one of the envelopes of `C`. */
export type ErrorResponse<C extends string> = JsonResponse<z.ZodType<ErrorBody<C>>>;

/** The codes an error response declares, or `never` for a response that does not name them. */
export type CodesOf<R> =
  R extends JsonResponse<infer S>
    ? z.output<S> extends { readonly error: { readonly code: infer K } }
      ? string extends K
        ? never
        : K & string
      : never
    : never;

/**
 * The errors a route declares: a list of codes, each answered with its status from `ERRORS`.
 * The document and the route's type group them by status.
 */
export type ErrorList<Allowed extends string> = readonly Allowed[];

type StatusOfCode<C> = C extends ErrorCode ? ErrorStatusMap[C] : never;

type CodesAnsweredWith<C, S> = C extends ErrorCode
  ? ErrorStatusMap[C] extends S
    ? C
    : never
  : never;

/** A list of codes grouped by the status each is answered with, as `groupByStatus` does at run time. */
export type GroupedByStatus<C extends string> = {
  readonly [S in StatusOfCode<C>]: readonly CodesAnsweredWith<C, S>[];
};

type NamedCode<R> = R extends { readonly '~code'?: infer C }
  ? C extends string
    ? string extends C
      ? never
      : C
    : never
  : never;

type CodesInResponse<R> = CodesOf<R> | NamedCode<R>;

/** The codes each error response of `R` names in its type, by status: what a route's `errorCodes` holds. */
export type ErrorCodesIn<R> = {
  readonly [
    S in keyof R as [CodesInResponse<R[S]>] extends [never] ? never : S
  ]: readonly CodesInResponse<R[S]>[];
};

/**
 * What a group declares where a response must be written whole (a foreign error format), keyed by
 * status. The codes under a status are the older form: prefer an `ErrorList`.
 */
export type ErrorsInput<Allowed extends string> = Readonly<
  Partial<Record<ErrorStatus, Response | readonly Allowed[]>>
>;

/** A list of codes grouped by the status each is answered with. */
export function groupByStatus(codes: readonly string[]): Record<string, readonly string[]> {
  const out: Record<string, string[]> = {};
  for (const code of codes) {
    const status = String(statusOf(code as ErrorCode));
    out[status] = [...(out[status] ?? []), code];
  }
  return out;
}

/**
 * An api's error vocabulary: the response it documents once per status (a component, so a route
 * that adds nothing keeps its `$ref`), the codes that response already stands for, and the
 * envelope of one code.
 */
export interface ErrorModel<Allowed extends string> {
  readonly standard: Readonly<
    Partial<Record<ErrorStatus, { readonly response: Response; readonly codes: readonly string[] }>>
  >;
  readonly envelopeOf: (code: string) => z.ZodType;
  /** A BFF: its calls go through a service, so a route can answer `502` and `504`. */
  readonly upstreams?: boolean;
  /** Never read at runtime: it carries `Allowed` to the compiler. */
  readonly allowed?: readonly Allowed[];
}

export function defineErrorModel<Allowed extends string>(
  model: ErrorModel<Allowed>,
): ErrorModel<Allowed> {
  return model;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

/**
 * The response for a status. A response already standing for every code asked, or asking for none,
 * is the api's own and is returned as it is; otherwise a response is built that lists the standard
 * codes and the added ones.
 */
export function errorResponseFor(
  model: ErrorModel<string> | undefined,
  status: number,
  codes: readonly string[],
  base: Response | undefined,
): Response {
  const standard = model?.standard[status as ErrorStatus];
  const answering = base ?? standard?.response;
  const known = standard?.codes ?? [];
  if (answering !== undefined && codes.every((code) => known.includes(code))) return answering;
  if (model === undefined)
    throw new Error(`errors: status ${String(status)} names codes with no error model.`);
  const all = unique([...known, ...codes]);
  const schemas = all.map((code) => model.envelopeOf(code));
  const [first, ...rest] = schemas;
  if (first === undefined) throw new Error(`errors: status ${String(status)} has no code.`);
  return {
    description: answering?.description ?? `Refused with status ${String(status)}.`,
    content: {
      'application/json': {
        schema: rest.length === 0 ? first : z.union([first, ...rest]),
      },
    },
  };
}

/**
 * The errors every route of an api can answer whatever it declares: the framework's refusals, the
 * rate limit, the identity and the surface. They are the same envelope on every route, so no
 * annotation lists them and the typed client adds them to what a route declares.
 */
export const DERIVED_ERROR_CODES: {
  readonly 400: readonly [typeof ApiErrorCode.SCHEMA_INVALID];
  readonly 401: readonly [typeof ApiErrorCode.UNAUTHENTICATED];
  readonly 403: readonly [
    typeof ApiErrorCode.FORBIDDEN,
    typeof ApiErrorCode.RIGHTS_VERSION_STALE,
    typeof ApiErrorCode.REAUTHENTICATION_REQUIRED,
  ];
  readonly 413: readonly [typeof ApiErrorCode.PAYLOAD_TOO_LARGE];
  readonly 415: readonly [typeof ApiErrorCode.UNSUPPORTED_MEDIA_TYPE];
  readonly 429: readonly [typeof ApiErrorCode.RATE_LIMITED];
  readonly 500: readonly [typeof ApiErrorCode.INTERNAL];
  readonly 502: readonly [typeof ApiErrorCode.UPSTREAM_UNAVAILABLE];
  readonly 504: readonly [
    typeof ApiErrorCode.UPSTREAM_TIMEOUT,
    typeof ApiErrorCode.DEADLINE_EXCEEDED,
  ];
} = {
  400: [ApiErrorCode.SCHEMA_INVALID],
  401: [ApiErrorCode.UNAUTHENTICATED],
  403: [
    ApiErrorCode.FORBIDDEN,
    ApiErrorCode.RIGHTS_VERSION_STALE,
    ApiErrorCode.REAUTHENTICATION_REQUIRED,
  ],
  413: [ApiErrorCode.PAYLOAD_TOO_LARGE],
  415: [ApiErrorCode.UNSUPPORTED_MEDIA_TYPE],
  429: [ApiErrorCode.RATE_LIMITED],
  500: [ApiErrorCode.INTERNAL],
  502: [ApiErrorCode.UPSTREAM_UNAVAILABLE],
  504: [ApiErrorCode.UPSTREAM_TIMEOUT, ApiErrorCode.DEADLINE_EXCEEDED],
};

export type DerivedStatus = keyof typeof DERIVED_ERROR_CODES;

const EXAMPLE_TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736';
const EXAMPLE_SERVED_AT = '2026-09-21T20:31:04.118Z';

/** The envelope an example of `code` shows: its params and its nature from the registry. */
export function errorExampleOf(code: ErrorCode): unknown {
  return {
    error: {
      code,
      nature: natureOf(code),
      params: exampleOf(code),
      traceId: EXAMPLE_TRACE_ID,
    },
    servedAt: EXAMPLE_SERVED_AT,
  };
}

/** Type-only: the code a shared error response stands for, so two responses never share a type. */
export interface CodedResponse<C extends string> {
  readonly '~code'?: C;
}

/**
 * A shared error response: its description, the api's envelope, and an example written once per
 * code from the registry.
 */
export function errorResponse<S extends z.ZodType, const C extends ErrorCode>(
  schema: S,
  options: {
    readonly description: string;
    readonly code: C;
    readonly headers?: Response['headers'];
  },
): JsonResponse<S> & CodedResponse<C> {
  return {
    description: options.description,
    ...(options.headers !== undefined && { headers: options.headers }),
    content: { 'application/json': { schema, example: errorExampleOf(options.code) } },
  };
}
