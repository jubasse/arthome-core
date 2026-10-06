import { describe, expect, it } from 'vitest';

import { WAITLIST_PRIORITY_HOURS, seatsAvailable, seatsAvailableTo, type Gauge } from './seats.js';
import {
  assertWaitlistJoinable,
  isPriorityWindowOpen,
  outcomeEndsWaitlist,
  priorityUntilOf,
  waitlistEntryMayMove,
  waitlistStateOnJoin,
} from './waitlist.js';
import { isDomainError } from '../kernel/errors.js';
import { DateOutcome } from '../vocabulary/catalog.js';
import { WAITLIST_ENTRY_STATES, WaitlistEntryState } from '../vocabulary/commerce.js';
import { OrderErrorCode } from '../vocabulary/error-codes.js';

function refusalOf(act: () => void): unknown {
  try {
    act();
  } catch (error) {
    if (isDomainError(error)) return { code: error.code, params: error.params };
    throw error;
  }
  return null;
}

describe('the priority pool', () => {
  it('the public count leaves the pool out, a notified account sees it', () => {
    const gauge: Gauge = {
      capacityTotal: 250,
      seatsSold: 200,
      seatsHeld: 4,
      waitlistCount: 12,
      priorityPoolSeats: 46,
    };
    expect(seatsAvailable(gauge)).toBe(0);
    expect(seatsAvailableTo(gauge, { inPriorityPool: false })).toBe(0);
    expect(seatsAvailableTo(gauge, { inPriorityPool: true })).toBe(46);
  });

  it('the window closes at priorityUntil', () => {
    const priorityUntil = priorityUntilOf('2026-09-21T18:06:00.000Z');
    expect(WAITLIST_PRIORITY_HOURS).toBe(2);
    expect(priorityUntil).toBe('2026-09-21T20:06:00.000Z');
    expect(isPriorityWindowOpen(priorityUntil, '2026-09-21T20:05:59.999Z')).toBe(true);
    expect(isPriorityWindowOpen(priorityUntil, priorityUntil)).toBe(false);
    expect(isPriorityWindowOpen(null, '2026-09-21T19:00:00.000Z')).toBe(false);
  });

  it('joining inside a window notifies at once', () => {
    expect(waitlistStateOnJoin(true)).toBe(WaitlistEntryState.NOTIFIED);
    expect(waitlistStateOnJoin(false)).toBe(WaitlistEntryState.WAITING);
  });
});

describe('joining the waiting list', () => {
  const salesEndAt = '2026-11-04T20:00:00.000Z';
  const before = '2026-11-04T18:00:00.000Z';
  const joinable = { publicSeatsAvailable: 0, salesEndAt, outcome: null, now: before };

  it('joining refused while seats are on sale, after the cutoff, on a cancelled or interrupted date, allowed on a postponed one', () => {
    expect(
      refusalOf(() => {
        assertWaitlistJoinable(joinable);
      }),
    ).toBeNull();
    expect(
      refusalOf(() => {
        assertWaitlistJoinable({ ...joinable, publicSeatsAvailable: 3 });
      }),
    ).toEqual({ code: OrderErrorCode.WAITLIST_NOT_SOLD_OUT, params: {} });
    const closed = { code: OrderErrorCode.SALES_CLOSED, params: { salesEndAt } };
    expect(
      refusalOf(() => {
        assertWaitlistJoinable({ ...joinable, now: salesEndAt });
      }),
    ).toEqual(closed);
    expect(
      refusalOf(() => {
        assertWaitlistJoinable({ ...joinable, outcome: DateOutcome.CANCELLED });
      }),
    ).toEqual(closed);
    expect(
      refusalOf(() => {
        assertWaitlistJoinable({ ...joinable, outcome: DateOutcome.INTERRUPTED });
      }),
    ).toEqual(closed);
    expect(
      refusalOf(() => {
        assertWaitlistJoinable({ ...joinable, outcome: DateOutcome.POSTPONED });
      }),
    ).toBeNull();
  });

  it('says sales closed rather than seats left once the cutoff passed', () => {
    expect(
      refusalOf(() => {
        assertWaitlistJoinable({ ...joinable, publicSeatsAvailable: 3, now: salesEndAt });
      }),
    ).toEqual({ code: OrderErrorCode.SALES_CLOSED, params: { salesEndAt } });
  });
});

describe("a waiting-list entry's moves", () => {
  it('entry moves, both directions', () => {
    const allowed = WAITLIST_ENTRY_STATES.flatMap((from) =>
      WAITLIST_ENTRY_STATES.filter((to) => waitlistEntryMayMove(from, to)).map(
        (to) => `${from}>${to}`,
      ),
    );
    const { WAITING, NOTIFIED, CONVERTED, LEFT, LAPSED, CLOSED } = WaitlistEntryState;
    expect(allowed).toEqual([
      `${WAITING}>${NOTIFIED}`,
      `${WAITING}>${CONVERTED}`,
      `${WAITING}>${LEFT}`,
      `${WAITING}>${CLOSED}`,
      `${NOTIFIED}>${NOTIFIED}`,
      `${NOTIFIED}>${CONVERTED}`,
      `${NOTIFIED}>${LEFT}`,
      `${NOTIFIED}>${LAPSED}`,
      `${NOTIFIED}>${CLOSED}`,
      `${CONVERTED}>${WAITING}`,
      `${CONVERTED}>${NOTIFIED}`,
      `${LEFT}>${WAITING}`,
      `${LEFT}>${NOTIFIED}`,
      `${LAPSED}>${WAITING}`,
      `${LAPSED}>${NOTIFIED}`,
    ]);
  });

  it('a second tier opening inside a window notifies a notified entry again', () => {
    expect(waitlistEntryMayMove(WaitlistEntryState.NOTIFIED, WaitlistEntryState.NOTIFIED)).toBe(
      true,
    );
    expect(waitlistEntryMayMove(WaitlistEntryState.WAITING, WaitlistEntryState.WAITING)).toBe(
      false,
    );
    expect(waitlistEntryMayMove(WaitlistEntryState.CLOSED, WaitlistEntryState.CLOSED)).toBe(false);
  });

  it('a cancellation and an interruption end the list, a postponement does not (D-096)', () => {
    expect(outcomeEndsWaitlist(DateOutcome.CANCELLED)).toBe(true);
    expect(outcomeEndsWaitlist(DateOutcome.INTERRUPTED)).toBe(true);
    expect(outcomeEndsWaitlist(DateOutcome.POSTPONED)).toBe(false);
  });
});
