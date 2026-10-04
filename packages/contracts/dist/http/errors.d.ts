/**
 * Error responses declared by code. A route says which codes a status can carry; the response that
 * documents it, and the client's type for it, are built from the code registry of `@arthome/core`:
 * one envelope per code, its `params` typed by `ERROR_PARAMS`, joined in a union discriminated on
 * `error.code`.
 */
import { z } from 'zod';
import { ApiErrorCode } from '@arthome/core';
import { type ErrorCode } from '@arthome/core';
import type { ErrorParamsRead } from '@arthome/core/schema';
import type { JsonResponse, Response } from './index.js';
export type ErrorStatus = 400 | 401 | 402 | 403 | 404 | 409 | 410 | 412 | 413 | 415 | 422 | 423 | 429 | 500 | 502 | 503 | 504;
/** The body of a failure carrying `C`: a union over the members of `C`, discriminated on `error.code`. */
export type ErrorBody<C extends string> = C extends string ? {
    readonly error: {
        readonly code: C;
        readonly params: C extends ErrorCode ? ErrorParamsRead<C> : never;
        readonly nature: string;
        readonly traceId: string;
    };
    readonly servedAt: string;
} : never;
/** An error response whose body is one of the envelopes of `C`. */
export type ErrorResponse<C extends string> = JsonResponse<z.ZodType<ErrorBody<C>>>;
/** The codes an error response declares, or `never` for a response that does not name them. */
export type CodesOf<R> = R extends JsonResponse<infer S> ? z.output<S> extends {
    readonly error: {
        readonly code: infer K;
    };
} ? string extends K ? never : K & string : never : never;
/**
 * The errors a route declares: a list of codes, each answered with its status from `ERROR_STATUS`.
 * The document groups them by status.
 */
export type ErrorList<Allowed extends string> = readonly Allowed[];
/**
 * What a group declares where a response must be written whole (a foreign error format), keyed by
 * status. The codes under a status are the older form: prefer an `ErrorList`.
 */
export type ErrorsInput<Allowed extends string> = Readonly<Partial<Record<ErrorStatus, Response | readonly Allowed[]>>>;
/** A list of codes grouped by the status each is answered with. */
export declare function groupByStatus(codes: readonly string[]): Record<string, readonly string[]>;
/**
 * An api's error vocabulary: the response it documents once per status (a component, so a route
 * that adds nothing keeps its `$ref`), the codes that response already stands for, and the
 * envelope of one code.
 */
export interface ErrorModel<Allowed extends string> {
    readonly standard: Readonly<Partial<Record<ErrorStatus, {
        readonly response: Response;
        readonly codes: readonly string[];
    }>>>;
    readonly envelopeOf: (code: string) => z.ZodType;
    /** A BFF: its calls go through a service, so a route can answer `502` and `504`. */
    readonly upstreams?: boolean;
    /** Never read at runtime: it carries `Allowed` to the compiler. */
    readonly allowed?: readonly Allowed[];
}
export declare function defineErrorModel<Allowed extends string>(model: ErrorModel<Allowed>): ErrorModel<Allowed>;
/**
 * The response for a status. A response already standing for every code asked, or asking for none,
 * is the api's own and is returned as it is; otherwise a response is built that lists the standard
 * codes and the added ones.
 */
export declare function errorResponseFor(model: ErrorModel<string> | undefined, status: number, codes: readonly string[], base: Response | undefined): Response;
/**
 * The errors every route of an api can answer whatever it declares: the framework's refusals, the
 * rate limit, the identity and the surface. They are the same envelope on every route, so no
 * annotation lists them and the typed client adds them to what a route declares.
 */
export declare const DERIVED_ERROR_CODES: {
    readonly 400: readonly [typeof ApiErrorCode.SCHEMA_INVALID];
    readonly 401: readonly [typeof ApiErrorCode.UNAUTHENTICATED];
    readonly 403: readonly [
        typeof ApiErrorCode.FORBIDDEN,
        typeof ApiErrorCode.RIGHTS_VERSION_STALE,
        typeof ApiErrorCode.REAUTHENTICATION_REQUIRED
    ];
    readonly 413: readonly [typeof ApiErrorCode.PAYLOAD_TOO_LARGE];
    readonly 415: readonly [typeof ApiErrorCode.UNSUPPORTED_MEDIA_TYPE];
    readonly 429: readonly [typeof ApiErrorCode.RATE_LIMITED];
    readonly 500: readonly [typeof ApiErrorCode.INTERNAL];
    readonly 502: readonly [typeof ApiErrorCode.UPSTREAM_UNAVAILABLE];
    readonly 504: readonly [
        typeof ApiErrorCode.UPSTREAM_TIMEOUT,
        typeof ApiErrorCode.DEADLINE_EXCEEDED
    ];
};
export type DerivedStatus = keyof typeof DERIVED_ERROR_CODES;
/** The envelope an example of `code` shows: its params from the registry, nature from its status. */
export declare function errorExampleOf(code: ErrorCode): unknown;
/**
 * A shared error response: its description, the api's envelope, and an example written once per
 * code from the registry.
 */
/** Type-only: the code a shared error response stands for, so two responses never share a type. */
export interface CodedResponse<C extends string> {
    readonly '~code'?: C;
}
export declare function errorResponse<S extends z.ZodType, const C extends ErrorCode>(schema: S, options: {
    readonly description: string;
    readonly code: C;
    readonly headers?: Response['headers'];
}): JsonResponse<S> & CodedResponse<C>;
//# sourceMappingURL=errors.d.ts.map