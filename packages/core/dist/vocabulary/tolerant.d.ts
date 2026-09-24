/**
 * TOLERANT reading of a closed vocabulary.
 *
 * This is the one rule in the package whose failure is unrecoverable at a
 * distance: it puts a black screen in front of people who can do nothing
 * about it.
 *
 * TV store review is slow. A build shipped today will still be running in
 * living rooms a year from now. The day the catalogue gains a 22nd discipline,
 * a new date outcome or a new chat mode, THOSE SETS WILL RECEIVE IT. And strict
 * enum validation does not degrade one card — it fails validation of the WHOLE
 * PAGE.
 *
 * Hence the rule, written into the contract and implemented here once:
 *   keep the raw value and treat it as NEUTRAL. Never reject.
 *
 * Severity applies to SHAPE — required fields, types — never to a vocabulary
 * MEMBER. (storefront-tv, Q12.)
 */
/** A closed vocabulary: the list that has authority. */
export type Vocabulary<T extends string> = readonly T[];
export interface KnownMember<T extends string> {
    readonly known: true;
    readonly value: T;
}
export interface UnknownMember {
    readonly known: false;
    /** The raw value, KEPT. It is neutral; it is not lost. */
    readonly raw: string;
}
export type Tolerant<T extends string> = KnownMember<T> | UnknownMember;
/**
 * Reads a value against its vocabulary without ever failing.
 *
 * An unknown value comes back as it arrived, marked unknown: the surface shows
 * it with a generic label rather than a raw code, and the rest of the page
 * renders normally.
 */
export declare function parseTolerant<T extends string>(vocabulary: Vocabulary<T>, raw: string): Tolerant<T>;
/**
 * Type guard, for the paths where an unknown value must be ignored rather than
 * kept — a filter, a sort, an aggregate.
 *
 * Use it ONLY where the value is not displayed. On a display, `parseTolerant`
 * is the one that applies.
 */
export declare function isMember<T extends string>(vocabulary: Vocabulary<T>, raw: string): raw is T;
/**
 * Returns the value if it is known, the fallback otherwise.
 *
 * The fallback is ALWAYS explicit at the call site. A default fallback hidden
 * inside this function would drop everyone onto the same value without anyone
 * seeing it — exactly what `helpers.planOf()` did with `free`, and that is an
 * authorization defect, not a display one (E1).
 */
export declare function memberOr<T extends string>(vocabulary: Vocabulary<T>, raw: string, fallback: T): T;
//# sourceMappingURL=tolerant.d.ts.map