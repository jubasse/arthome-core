/** A domain error carries a code and its parameters, never a sentence: i18n by codes. */

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

export interface DomainErrorInit {
  readonly code: string;
  readonly params?: MessageParams;
  readonly nature?: FailureNature;
}

/** An invariant violation. It carries no text: it carries a code. */
export class DomainError extends Error {
  public readonly code: string;
  public readonly params: MessageParams;
  public readonly nature: FailureNature;

  public constructor(init: DomainErrorInit) {
    super(init.code);
    this.name = 'DomainError';
    this.code = init.code;
    this.params = init.params ?? {};
    this.nature = init.nature ?? FailureNature.REFUSED;
  }
}

export function isDomainError(value: unknown): value is DomainError {
  return value instanceof DomainError;
}
