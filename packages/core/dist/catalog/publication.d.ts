/**
 * A publication's state machine, and its two ONE-WAY passages.
 *
 * E5 — the quietest and most important correction: the fixtures encode
 * `lockedTransitions: ['scheduled', 'replay_online']`, a list of STATES, and
 * test membership of the current state. The mockup encodes `from>to` PAIRS.
 * Those are two different semantics, and the second is the right one —
 * locking a STATE would also prevent entering it.
 *
 * And a guarantee the interface does not give: **the server refuses the reverse
 * transition**. Not offering it on screen is a courtesy, not a guarantee.
 */
import { PublicationState } from '../vocabulary/catalog.js';
/** An offered transition, with what it commits to. */
export interface PublicationTransition {
    readonly from: PublicationState;
    readonly to: PublicationState;
    /**
     * The CODE of the promise made, served with the refusal so the message can be
     * translated client-side. Null when the transition is reversible.
     */
    readonly irreversiblePromiseCode: string | null;
}
export declare function orderRankOf(state: PublicationState): number;
/**
 * The transitions offered TO THIS OPERATOR.
 *
 * `canDecide` (artist ∨ production) is an ARGUMENT: only the owner and
 * production move a date; a run desk sees the sheet and does not move it.
 * Serving the list stops every surface recomputing the table — and it is also
 * what lets the realtime correction carry the RECIPIENT's transitions, without
 * which a stale button would stay on screen (`realtime.md` §3.3).
 */
export declare function nextPublicationTransitions(from: PublicationState, canDecide: boolean): readonly PublicationTransition[];
/** Is this transition caused by an event rather than commanded? */
export declare function isEventDriven(from: PublicationState, to: PublicationState): boolean;
/**
 * The lock is on the PAIR, never on the state.
 *
 * Returns the code of the promise made when the reverse transition is refused,
 * `null` when it is simply unknown — two different refusals, two different
 * messages.
 */
export declare function irreversiblePromiseBlocking(from: PublicationState, to: PublicationState): string | null;
export declare function assertTransitionAllowed(from: PublicationState, to: PublicationState, canDecide: boolean): void;
/**
 * THE AUTHORITATIVE CHECKLIST: SEVEN items, the ones on the sheet.
 *
 * `studio-web` Q7: the fixtures carry FOUR, the sheet shows SEVEN, and both
 * answer the same question. The four are an arbitrary subset; the seven are the
 * ones a screen actually exercised.
 *
 * ⚠ THREE of the seven are FACTS PROJECTED from other contexts —
 * `at_least_one_active_price` and `capacity` come from `ticketing`,
 * `technical_check_passed` from `streaming`. `catalog` keeps them up to date by
 * event and asks nobody for them: that is what stops a publication needing a
 * synchronous call to two services.
 */
export declare const PUBLICATION_CHECKLIST_ITEMS: readonly ["title_and_discipline", "poster", "description", "at_least_one_active_price", "capacity", "technical_check_passed", "chat_mode_set", "chapters_planned", "moderator_assigned"];
export type PublicationChecklistItem = (typeof PUBLICATION_CHECKLIST_ITEMS)[number];
/**
 * The NAMED members, so that nothing writes one of these as a string.
 *
 * ⚠ IT WAS THE ONLY VOCABULARY IN THIS PACKAGE WITHOUT ONE, and the absence
 *   was found the way absences are: something needed a member and had to
 *   write a literal instead. `@arthome/contracts`' error examples carry
 *   `poster`, `capacity` and `technical_check_passed`, and `check-enums`
 *   reported all three — correctly, because a literal is a literal whatever
 *   it is illustrating. An example written as the constant cannot drift when
 *   the constant is renamed, which is a better example than a quoted string.
 */
export declare const PublicationChecklistItem: {
    readonly TITLE_AND_DISCIPLINE: "title_and_discipline";
    readonly POSTER: "poster";
    readonly DESCRIPTION: "description";
    readonly AT_LEAST_ONE_ACTIVE_PRICE: "at_least_one_active_price";
    readonly CAPACITY: "capacity";
    readonly TECHNICAL_CHECK_PASSED: "technical_check_passed";
    readonly CHAT_MODE_SET: "chat_mode_set";
    readonly CHAPTERS_PLANNED: "chapters_planned";
    readonly MODERATOR_ASSIGNED: "moderator_assigned";
};
export declare function isBlockingChecklistItem(item: PublicationChecklistItem): boolean;
/** One checklist item, with everything a surface needs to render its row. */
export interface PublicationChecklistEntry {
    readonly item: PublicationChecklistItem;
    readonly satisfied: boolean;
    readonly blocking: boolean;
}
export interface PublicationReadiness {
    readonly ready: boolean;
    /** All NINE, in declaration order — the surface renders this, it composes nothing. */
    readonly entries: readonly PublicationChecklistEntry[];
    /** The MISSING blocking identifiers — never a percentage, which the client computes. */
    readonly missing: readonly PublicationChecklistItem[];
    /** The unmet NON-blocking items. Derived from `entries`; served because the screen labels them differently. */
    readonly warnings: readonly PublicationChecklistItem[];
}
export declare function publicationReadiness(satisfied: readonly PublicationChecklistItem[]): PublicationReadiness;
//# sourceMappingURL=publication.d.ts.map