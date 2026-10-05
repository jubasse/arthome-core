/** Query parameters that several routes repeat, written once. */

import { z } from 'zod';

import { ApiErrorCode } from '@arthome/core';
import { dateIn, dateTimeIn } from '@arthome/core/schema';

import type { Parameter, QueryParameter } from './index.js';

export type PeriodType = 'date' | 'dateTime';

export interface PeriodOptions<Required extends boolean = true> {
  readonly type: PeriodType;
  /** A required period is refused with `api.period_filter_required` when a bound is missing. */
  readonly required?: Required;
  readonly descriptions?: { readonly from?: string; readonly to?: string };
}

/** `from` and `to`, and the refusal a required period implies. Assign the result to a named const. */
export interface Period<Required extends boolean = true> {
  readonly parameters: readonly [
    QueryParameter<'from', z.ZodString, Required>,
    QueryParameter<'to', z.ZodString, Required>,
  ];
  readonly errors: Required extends true
    ? readonly [typeof ApiErrorCode.PERIOD_FILTER_REQUIRED]
    : readonly [];
}

export function period<const Required extends boolean = true>(
  options: PeriodOptions<Required>,
): Period<Required> {
  const bound = <Name extends 'from' | 'to'>(
    name: Name,
  ): QueryParameter<Name, z.ZodString, Required> => {
    const parameter: Parameter = {
      name,
      in: 'query',
      ...(options.required !== false && { required: true }),
      ...(options.descriptions?.[name] !== undefined && {
        description: options.descriptions[name],
      }),
      schema: options.type === 'date' ? dateIn() : dateTimeIn(),
    };
    return parameter as QueryParameter<Name, z.ZodString, Required>;
  };
  return {
    parameters: [bound('from'), bound('to')],
    errors: (options.required === false
      ? []
      : [ApiErrorCode.PERIOD_FILTER_REQUIRED]) as unknown as Period<Required>['errors'],
  };
}

export interface SearchTextOptions {
  readonly description?: string;
  readonly minLength?: number;
}

/** The free-text `q`, searched server-side. Assign the result to a named const. */
export function searchText(options: SearchTextOptions = {}): QueryParameter<'q', z.ZodString> {
  return {
    name: 'q',
    in: 'query',
    ...(options.description !== undefined && { description: options.description }),
    schema: options.minLength === undefined ? z.string() : z.string().min(options.minLength),
  };
}
