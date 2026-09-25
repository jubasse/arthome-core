/**
 * A publication's state machine, and its two one-way passages.
 *
 * E5: the fixtures encoded `lockedTransitions` as a list of STATES and tested membership of the
 * current state; the mockup encoded `from>to` PAIRS. The second is right — locking a state would
 * also prevent entering it.
 *
 * The server refuses the reverse transition. Not offering it on screen is a courtesy, not a
 * guarantee.
 */
import { PublicationState } from '../vocabulary/catalog.js';
/** An offered transition, with what it commits to. */
export interface PublicationTransition {
    readonly from: PublicationState;
    readonly to: PublicationState;
    /** The promise's code, served with the refusal so the message is translated client-side. */
    readonly irreversiblePromiseCode: string | null;
}
export declare function orderRankOf(state: PublicationState): number;
/**
 * The transitions offered to this operator.
 *
 * `canDecide` (artist ∨ production) is an argument because a run desk sees the sheet and does not
 * move it, and because the realtime correction has to carry the RECIPIENT's transitions —
 * without which a stale button stays on screen (`realtime.md` §3.3).
 */
export declare function nextPublicationTransitions(from: PublicationState, canDecide: boolean): readonly PublicationTransition[];
/** Is this transition caused by an event rather than commanded? */
export declare function isEventDriven(from: PublicationState, to: PublicationState): boolean;
/**
 * The promise blocking this transition, or `null` when it is merely unknown — two different
 * refusals, two different messages. The lock is on the pair, never on the state.
 */
export declare function irreversiblePromiseBlocking(from: PublicationState, to: PublicationState): string | null;
export declare function assertTransitionAllowed(from: PublicationState, to: PublicationState, canDecide: boolean): void;
/**
 * The authoritative checklist, in the order the sheet shows. `studio-web` Q7: the fixtures
 * carried four items and the sheet seven, an arbitrary subset against the ones a screen
 * exercised.
 *
 * ⚠ Three are facts projected from other contexts — `at_least_one_active_price` and `capacity`
 * from `ticketing`, `technical_check_passed` from `streaming`. `catalog` keeps them current by
 * event and asks nobody, which is what stops a publication needing two synchronous calls.
 */
export declare const PUBLICATION_CHECKLIST_ITEMS: readonly ["title_and_discipline", "poster", "description", "at_least_one_active_price", "capacity", "technical_check_passed", "chat_mode_set", "chapters_planned", "moderator_assigned"];
export type PublicationChecklistItem = (typeof PUBLICATION_CHECKLIST_ITEMS)[number];
/** The named members, so that nothing writes one of these as a string. */
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
    /** All nine, in declaration order: the surface renders this and composes nothing. */
    readonly entries: readonly PublicationChecklistEntry[];
    /** The missing blocking identifiers, never a percentage — the client computes that. */
    readonly missing: readonly PublicationChecklistItem[];
    /** The unmet non-blocking items, served because the screen labels them differently. */
    readonly warnings: readonly PublicationChecklistItem[];
}
export declare function publicationReadiness(satisfied: readonly PublicationChecklistItem[]): PublicationReadiness;
//# sourceMappingURL=publication.d.ts.map