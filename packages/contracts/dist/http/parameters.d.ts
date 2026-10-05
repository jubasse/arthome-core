/** Query parameters that several routes repeat, written once. */
import { z } from 'zod';
import { ApiErrorCode } from '@arthome/core';
import type { QueryParameter } from './index.js';
export type PeriodType = 'date' | 'dateTime';
export interface PeriodOptions<Required extends boolean = true> {
    readonly type: PeriodType;
    /** A required period is refused with `api.period_filter_required` when a bound is missing. */
    readonly required?: Required;
    readonly descriptions?: {
        readonly from?: string;
        readonly to?: string;
    };
}
/** `from` and `to`, and the refusal a required period implies. Assign the result to a named const. */
export interface Period<Required extends boolean = true> {
    readonly parameters: readonly [
        QueryParameter<'from', z.ZodString, Required>,
        QueryParameter<'to', z.ZodString, Required>
    ];
    readonly errors: Required extends true ? readonly [typeof ApiErrorCode.PERIOD_FILTER_REQUIRED] : readonly [];
}
export declare function period<const Required extends boolean = true>(options: PeriodOptions<Required>): Period<Required>;
export interface SearchTextOptions {
    readonly description?: string;
    readonly minLength?: number;
}
/** The free-text `q`, searched server-side. Assign the result to a named const. */
export declare function searchText(options?: SearchTextOptions): QueryParameter<'q', z.ZodString>;
//# sourceMappingURL=parameters.d.ts.map