/**
 * The schema of each published code's `error.params`, code for code with `ErrorParamsMap`: what the
 * contract documents and the client reads.
 */
import { z } from 'zod';
import type { ErrorParamsMap, NoErrorParams, SchemaIssue } from '../kernel/error-params.js';
import { ApiErrorCode, type ErrorCode } from '../vocabulary/error-codes.js';
/**
 * What a reader accepts for `C`. An unknown rule is kept raw (critical rule 10), and a code with
 * no params still reads one it does not know yet.
 */
export type ErrorParamsRead<C extends ErrorCode> = C extends typeof ApiErrorCode.SCHEMA_INVALID ? {
    issues: readonly (Omit<SchemaIssue, 'rule'> & {
        rule: string;
    })[];
} : NoErrorParams extends ErrorParamsMap[C] ? Readonly<Record<string, unknown>> : ErrorParamsMap[C];
export declare const ERROR_PARAMS: {
    readonly [C in ErrorCode]: z.ZodType<ErrorParamsRead<C>>;
};
export declare function errorParamsSchemaOf(code: ErrorCode): z.ZodType;
//# sourceMappingURL=error-params.d.ts.map