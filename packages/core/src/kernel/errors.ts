/** A domain error carries a code and its parameters, never a sentence: i18n by codes. */

import type { ErrorParamsOf, NoErrorParams, RaisableErrorCode } from './error-params.js';
import {
  ApiErrorCode,
  CatalogErrorCode,
  ChatErrorCode,
  DomainErrorCode,
  PairingErrorCode,
} from '../vocabulary/error-codes.js';

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

/** The codes a caller waits out rather than corrects: every other code is refused. */
const UNAVAILABLE_CODES: ReadonlySet<RaisableErrorCode> = new Set<RaisableErrorCode>([
  ApiErrorCode.RATE_LIMITED,
  ApiErrorCode.INTERNAL,
  ApiErrorCode.SERVICE_UNAVAILABLE,
  ApiErrorCode.UPSTREAM_UNAVAILABLE,
  ApiErrorCode.DEADLINE_EXCEEDED,
  ApiErrorCode.UPSTREAM_TIMEOUT,
  // It carries `retryAfterMs`: the caller is asked to retry, which a refusal never does.
  ApiErrorCode.IDEMPOTENCY_IN_FLIGHT,
  PairingErrorCode.SLOW_DOWN,
  ChatErrorCode.RATE_LIMITED,
  // The slug is the server's choice, and publishing again takes the next free one.
  CatalogErrorCode.SHOW_SLUG_TAKEN,
  // Thrown on read, when stored content is empty in both languages: the caller did nothing wrong.
  DomainErrorCode.CONTENT_EMPTY_IN_BOTH_LANGUAGES,
]);

/** A code's nature, for the error a domain raises and for the error a route documents. */
export function natureOf(code: RaisableErrorCode): FailureNature {
  return UNAVAILABLE_CODES.has(code) ? FailureNature.UNAVAILABLE : FailureNature.REFUSED;
}

/** `params` may be left out only where the code's params accept none. */
type ParamsField<P> = NoErrorParams extends P ? { readonly params?: P } : { readonly params: P };

export type DomainErrorInit<C extends RaisableErrorCode> = {
  readonly code: C;
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
    this.nature = natureOf(init.code);
  }
}

export function isDomainError(value: unknown): value is DomainError {
  return value instanceof DomainError;
}
