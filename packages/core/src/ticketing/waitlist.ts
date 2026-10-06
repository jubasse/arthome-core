/** The waiting list and its priority window (adr-ticketing.md §9, D-083, D-096). */

import { WAITLIST_PRIORITY_HOURS, salesEndedBy } from './seats.js';
import type { Instant } from '../kernel/clock.js';
import { DomainError } from '../kernel/errors.js';
import { isBefore, plusHours } from '../time/instant.js';
import { DateOutcome } from '../vocabulary/catalog.js';
import { WaitlistEntryState } from '../vocabulary/commerce.js';
import { OrderErrorCode } from '../vocabulary/error-codes.js';

export function priorityUntilOf(openedAt: Instant): Instant {
  return plusHours(openedAt, WAITLIST_PRIORITY_HOURS);
}

/** Closed with no window, and at `priorityUntil` itself. */
export function isPriorityWindowOpen(priorityUntil: Instant | null, now: Instant): boolean {
  return priorityUntil !== null && isBefore(now, priorityUntil);
}

/** `left`, `lapsed` and `converted` move back when the account registers again, on the same row. */
const WAITLIST_ENTRY_MOVES: Readonly<Record<WaitlistEntryState, readonly WaitlistEntryState[]>> = {
  [WaitlistEntryState.WAITING]: [
    WaitlistEntryState.NOTIFIED,
    WaitlistEntryState.CONVERTED,
    WaitlistEntryState.LEFT,
    WaitlistEntryState.CLOSED,
  ],
  [WaitlistEntryState.NOTIFIED]: [
    WaitlistEntryState.CONVERTED,
    WaitlistEntryState.LAPSED,
    WaitlistEntryState.LEFT,
    WaitlistEntryState.CLOSED,
  ],
  [WaitlistEntryState.CONVERTED]: [WaitlistEntryState.WAITING, WaitlistEntryState.NOTIFIED],
  [WaitlistEntryState.LEFT]: [WaitlistEntryState.WAITING, WaitlistEntryState.NOTIFIED],
  [WaitlistEntryState.LAPSED]: [WaitlistEntryState.WAITING, WaitlistEntryState.NOTIFIED],
  [WaitlistEntryState.CLOSED]: [],
};

export function waitlistEntryMayMove(from: WaitlistEntryState, to: WaitlistEntryState): boolean {
  return WAITLIST_ENTRY_MOVES[from].includes(to);
}

/** An account that registers while a window is open is notified into it at once. */
export function waitlistStateOnJoin(windowOpen: boolean): WaitlistEntryState {
  return windowOpen ? WaitlistEntryState.NOTIFIED : WaitlistEntryState.WAITING;
}

const OUTCOME_ENDS_WAITLIST: Readonly<Record<DateOutcome, boolean>> = {
  [DateOutcome.POSTPONED]: false,
  [DateOutcome.CANCELLED]: true,
  [DateOutcome.INTERRUPTED]: true,
};

/** D-096: a postponement leaves the entries waiting. */
export function outcomeEndsWaitlist(outcome: DateOutcome): boolean {
  return OUTCOME_ENDS_WAITLIST[outcome];
}

/**
 * Closed sales come first, by time or by the date's outcome: past them a seat left on sale cannot be
 * bought, so `waitlist.not_sold_out` would send the viewer to a purchase that fails. A date with no
 * start sells nothing and has no list, so `salesEndAt` is known here.
 */
export function assertWaitlistJoinable(facts: {
  readonly publicSeatsAvailable: number;
  readonly salesEndAt: Instant;
  readonly outcome: DateOutcome | null;
  readonly now: Instant;
}): void {
  const endedByOutcome = facts.outcome !== null && outcomeEndsWaitlist(facts.outcome);
  if (endedByOutcome || salesEndedBy(facts.salesEndAt, facts.now)) {
    throw new DomainError({
      code: OrderErrorCode.SALES_CLOSED,
      params: { salesEndAt: facts.salesEndAt },
    });
  }
  if (facts.publicSeatsAvailable > 0) {
    throw new DomainError({ code: OrderErrorCode.WAITLIST_NOT_SOLD_OUT });
  }
}
