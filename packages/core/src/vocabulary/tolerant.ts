/**
 * Tolerant reading of a closed vocabulary: keep the raw value, treat it as
 * neutral, never reject.
 *
 * A TV build shipped today still runs a year later, and strict enum validation
 * fails the whole page, not one card. Severity applies to shape, never to a
 * vocabulary member (storefront-tv, Q12).
 */

/** A closed vocabulary: the list that has authority. */
export type Vocabulary<T extends string> = readonly T[];

export interface KnownMember<T extends string> {
  readonly known: true;
  readonly value: T;
}

export interface UnknownMember {
  readonly known: false;
  readonly raw: string;
}

export type Tolerant<T extends string> = KnownMember<T> | UnknownMember;

/** Reads a value against its vocabulary without ever failing. */
export function parseTolerant<T extends string>(
  vocabulary: Vocabulary<T>,
  raw: string,
): Tolerant<T> {
  return (vocabulary as readonly string[]).includes(raw)
    ? { known: true, value: raw as T }
    : { known: false, raw };
}

/**
 * Type guard for the paths where an unknown value is ignored rather than kept —
 * a filter, a sort, an aggregate. On a display, `parseTolerant` applies.
 */
export function isMember<T extends string>(vocabulary: Vocabulary<T>, raw: string): raw is T {
  return (vocabulary as readonly string[]).includes(raw);
}

/**
 * Returns the value if it is known, the fallback otherwise — and the fallback
 * stays explicit at the call site: a default hidden here would drop everyone onto
 * one value unseen, as `helpers.planOf()` did with `free` (E1).
 */
export function memberOr<T extends string>(vocabulary: Vocabulary<T>, raw: string, fallback: T): T {
  return isMember(vocabulary, raw) ? raw : fallback;
}
