/**
 * Error responses declared by code. A route says which codes a status can carry; the response that
 * documents it, and the client's type for it, are built from the code registry of `@arthome/core`:
 * one envelope per code, its `params` typed by `ERROR_PARAMS`, joined in a union discriminated on
 * `error.code`.
 */
import { z } from 'zod';
import type { ErrorCode } from '@arthome/core';
import type { ErrorParamsRead } from '@arthome/core/schema';
import type { JsonResponse, Response } from './index.js';
export type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 410 | 412 | 413 | 415 | 422 | 423 | 429 | 500 | 502 | 503 | 504;
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
/** What a status takes where errors are declared: a response as the document writes it, or its codes. */
export type ErrorsInput<Allowed extends string> = Readonly<Partial<Record<ErrorStatus, Response | readonly Allowed[]>>>;
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
//# sourceMappingURL=errors.d.ts.map