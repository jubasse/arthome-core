/**
 * One entry per error code: the status it is answered with (transport.md §5.5), an example of its
 * params, and its nature where it is not its status's, so a route's error responses are grouped
 * and illustrated from one place.
 */
import { FailureNature, type ErrorCode, type ErrorParamsOf } from '@arthome/core';
import type { ErrorStatus } from './errors.js';
export interface ErrorDefinition<C extends ErrorCode = ErrorCode> {
    readonly status: ErrorStatus;
    readonly example: ErrorParamsOf<C>;
    /** Only where it differs from `NATURE_BY_STATUS`. */
    readonly nature?: FailureNature;
}
/** transport.md §5.5: a 4xx is refused, except 429; a 5xx is unavailable. */
export declare const NATURE_BY_STATUS: Readonly<Record<ErrorStatus, FailureNature>>;
export declare const ERRORS: {
    readonly [C in ErrorCode]: ErrorDefinition<C>;
};
export declare function statusOf(code: ErrorCode): ErrorStatus;
export declare function exampleOf<C extends ErrorCode>(code: C): ErrorParamsOf<C>;
export declare function natureOf(code: ErrorCode): FailureNature;
//# sourceMappingURL=error-registry.d.ts.map