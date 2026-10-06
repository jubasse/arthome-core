/** The waiting list and its priority window (adr-ticketing.md §9, D-083, D-096). */
import type { Instant } from '../kernel/clock.js';
import { DateOutcome } from '../vocabulary/catalog.js';
import { WaitlistEntryState } from '../vocabulary/commerce.js';
export declare function priorityUntilOf(openedAt: Instant): Instant;
/** Closed with no window, and at `priorityUntil` itself. */
export declare function isPriorityWindowOpen(priorityUntil: Instant | null, now: Instant): boolean;
export declare function waitlistEntryMayMove(from: WaitlistEntryState, to: WaitlistEntryState): boolean;
/** An account that registers while a window is open is notified into it at once. */
export declare function waitlistStateOnJoin(windowOpen: boolean): WaitlistEntryState;
/** D-096: a postponement leaves the entries waiting. */
export declare function outcomeEndsWaitlist(outcome: DateOutcome): boolean;
/**
 * Closed sales come first, by time or by the date's outcome: past them a seat left on sale cannot be
 * bought, so `waitlist.not_sold_out` would send the viewer to a purchase that fails. A date with no
 * start sells nothing and has no list, so `salesEndAt` is known here.
 */
export declare function assertWaitlistJoinable(facts: {
    readonly publicSeatsAvailable: number;
    readonly salesEndAt: Instant;
    readonly outcome: DateOutcome | null;
    readonly now: Instant;
}): void;
//# sourceMappingURL=waitlist.d.ts.map