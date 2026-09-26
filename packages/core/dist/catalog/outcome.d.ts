/**
 * When a date's outcome can be declared. A declared outcome is a fact, never rewritten nor erased
 * (data-model.md §2.2), and each of the three belongs to one moment of the date.
 */
import { type DateTiming } from './date-state.js';
import type { Instant } from '../kernel/clock.js';
import { DateOutcome, PublicationState } from '../vocabulary/catalog.js';
/** `rescheduledTo` is where a postponement moves the date (D-074); the other two carry none. */
export type OutcomeDeclaration = {
    readonly outcome: typeof DateOutcome.POSTPONED;
    readonly rescheduledTo: Instant;
} | {
    readonly outcome: typeof DateOutcome.CANCELLED | typeof DateOutcome.INTERRUPTED;
    readonly rescheduledTo: null;
};
export interface DateBeforeOutcome {
    readonly outcome: DateOutcome | null;
    readonly publicationState: PublicationState;
    readonly timing: DateTiming;
}
/**
 * Throws `state.conflict` when the declaration does not fit the date: an outcome already
 * declared; a date not public yet, which is deleted rather than cancelled; a postponement once
 * the live show has started or to an instant already past; an interruption before it started;
 * a cancellation once it has ended.
 */
export declare function assertOutcomeDeclarable(date: DateBeforeOutcome, declaration: OutcomeDeclaration, now: Instant): void;
//# sourceMappingURL=outcome.d.ts.map