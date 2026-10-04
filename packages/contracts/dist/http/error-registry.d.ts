/**
 * One entry per error code: the status it is answered with (transport.md §5.5) and an example of
 * its params, so a route's error responses are grouped and illustrated from one place.
 */
import { type ErrorCode, type ErrorParamsOf } from '@arthome/core';
import type { ErrorStatus } from './errors.js';
export interface ErrorDefinition<C extends ErrorCode = ErrorCode> {
    readonly status: ErrorStatus;
    readonly example: ErrorParamsOf<C>;
}
export declare const ERRORS: {
    readonly [C in ErrorCode]: ErrorDefinition<C>;
};
export declare function statusOf(code: ErrorCode): ErrorStatus;
export declare function exampleOf<C extends ErrorCode>(code: C): ErrorParamsOf<C>;
//# sourceMappingURL=error-registry.d.ts.map