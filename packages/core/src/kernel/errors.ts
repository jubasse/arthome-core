/** A domain error carries a code and its parameters, never a sentence: i18n by codes. */

import type { ErrorParamsOf, NoErrorParams, RaisableErrorCode } from './error-params.js';

/** Message parameters, resolved by the surface against its catalogue. */
export type MessageParams = Readonly<Record<string, string | number | boolean>>;

/**
 * The nature of a failure: retry, understand, or escalate.
 *
 * `offline_forbidden` is never emitted by a server — it is a local refusal,
 * in the vocabulary so the surface has a single error shape to render.
 */
export const FAILURE_NATURES = ['refused', 'unavailable', 'offline_forbidden'] as const;
export type FailureNature = (typeof FAILURE_NATURES)[number];

export const FailureNature = {
  REFUSED: 'refused',
  UNAVAILABLE: 'unavailable',
  OFFLINE_FORBIDDEN: 'offline_forbidden',
} as const;

/** `params` may be left out only where the code's params accept none. */
type ParamsField<P> = NoErrorParams extends P ? { readonly params?: P } : { readonly params: P };

export type DomainErrorInit<C extends RaisableErrorCode> = {
  readonly code: C;
  readonly nature?: FailureNature;
} & ParamsField<ErrorParamsOf<C>>;

const NO_PARAMS: NoErrorParams = {};

/** An invariant violation. It carries no text: it carries a code, and the params that code takes. */
export class DomainError<C extends RaisableErrorCode = RaisableErrorCode> extends Error {
  public readonly code: C;
  public readonly params: ErrorParamsOf<C>;
  public readonly nature: FailureNature;

  public constructor(init: DomainErrorInit<C>) {
    super(init.code);
    this.name = 'DomainError';
    this.code = init.code;
    // Absent only when `ParamsField` made it optional, that is when no params is a valid value.
    this.params = init.params ?? (NO_PARAMS as ErrorParamsOf<C>);
    this.nature = init.nature ?? FailureNature.REFUSED;
  }
}

export function isDomainError(value: unknown): value is DomainError {
  return value instanceof DomainError;
}
