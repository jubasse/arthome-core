import { describe, expect, it } from 'vitest';

import {
  WATCH_DENIAL_REASONS,
  WATCH_FALLBACK_ACTIONS,
  WATCH_FALLBACK_FOR,
  WatchDenialReason,
  WatchFallbackAction,
  WatchScope,
  concurrentStreamsAllowedFor,
  decideWatch,
  planOpeningsOf,
  previewSecondsLeft,
  seatStandingOf,
  type SeatStanding,
  type WatchInput,
} from './index.js';
import type { DateTiming } from '../catalog/date-state.js';
import { restrictedRights, worldwideRights } from '../catalog/rights.js';
import {
  BlackoutReason,
  DateOutcome,
  PublicationState,
  ReplayPolicy,
  RunState,
} from '../vocabulary/catalog.js';
import { PlanOpening, SubscriptionState } from '../vocabulary/commerce.js';

const timing: DateTiming = {
  startsAt: '2026-09-21T19:00:00.000Z',
  runtimeMin: 120,
  roomOpensBeforeMin: 30,
  replayPolicy: ReplayPolicy.INCLUDED,
  replayWindowHours: 48,
};

const onPublicSale: SeatStanding = {
  onPublicSale: true,
  priorityPoolOpen: false,
  onWaitlist: false,
};
const soldOutStranger: SeatStanding = {
  onPublicSale: false,
  priorityPoolOpen: false,
  onWaitlist: false,
};
const onTheList: SeatStanding = { onPublicSale: false, priorityPoolOpen: false, onWaitlist: true };

const inTheRoom = '2026-09-21T18:45:00.000Z';
const stillSelling = '2026-09-21T19:15:00.000Z';
const pastCutoff = '2026-09-21T19:30:00.000Z';

const base = (over: Partial<WatchInput> = {}): WatchInput => ({
  holdsSeat: false,
  seatExpired: false,
  planOpenings: [],
  concurrentStreamsOpen: 0,
  concurrentStreamsAllowed: 1,
  previewSecondsLeft: 300,
  viewerCountry: 'FR',
  rights: worldwideRights(),
  timing,
  publicationState: PublicationState.LIVE,
  runState: RunState.ON_AIR,
  outcome: null,
  seatStanding: onPublicSale,
  now: pastCutoff,
  ...over,
});

const room = (over: Partial<WatchInput> = {}): WatchInput =>
  base({
    publicationState: PublicationState.SCHEDULED,
    runState: RunState.IDLE,
    now: inTheRoom,
    ...over,
  });

/**
 * PROTECTED INVARIANT
 *   One verdict, the same refusal vocabulary on both sides — at display time as at
 *   player-open time.
 *
 * WHY THIS TEST EXISTS
 *   `isWatchable` assumed the client holds the complete list of the account's
 *   seats: untenable on mobile. And the case that matters is not the nominal
 *   one — it is the one where TWO refusals apply at once, where the message
 *   shown depends on the ORDER in which they are tested.
 */
describe('decideWatch — the truth table', () => {
  it('says OUT OF TERRITORY to a seat holder, not "no seat"', () => {
    // The case that decides the order of the tests: buying a seat would not
    // unblock this viewer. Saying "no seat" would send them off to spend money
    // for nothing.
    const verdict = decideWatch(
      base({
        holdsSeat: true,
        viewerCountry: 'BE',
        rights: restrictedRights(['BE'], BlackoutReason.CO_PRODUCTION),
      }),
    );

    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toBe(WatchDenialReason.OUT_OF_TERRITORY);
    expect(verdict.fallback).toBe(WatchFallbackAction.SEE_OTHER_DATES);
  });

  it('opens the live show to a held seat — principle no. 3', () => {
    const verdict = decideWatch(base({ holdsSeat: true }));
    expect(verdict.allowed).toBe(true);
    expect(verdict.scope).toBe(WatchScope.FULL);
  });

  it('opens a bounded PREVIEW to someone with no seat, on air', () => {
    const verdict = decideWatch(base({ previewSecondsLeft: 252, now: stillSelling }));
    expect(verdict.allowed).toBe(true);
    expect(verdict.scope).toBe(WatchScope.PREVIEW);
    expect(verdict.previewSecondsLeft).toBe(252);
    expect(verdict.fallback).toBe(WatchFallbackAction.BUY_SEAT);
  });

  it('refuses when the preview is exhausted, with the way out', () => {
    const verdict = decideWatch(base({ previewSecondsLeft: 0, now: stillSelling }));
    expect(verdict.reason).toBe(WatchDenialReason.PREVIEW_EXHAUSTED);
    expect(verdict.fallback).toBe(WatchFallbackAction.BUY_SEAT);
  });

  it('offers to RELEASE A SCREEN rather than refusing flatly', () => {
    const verdict = decideWatch(
      base({ holdsSeat: true, concurrentStreamsOpen: 1, concurrentStreamsAllowed: 1 }),
    );
    expect(verdict.reason).toBe(WatchDenialReason.CONCURRENT_LIMIT_REACHED);
    expect(verdict.fallback).toBe(WatchFallbackAction.RELEASE_A_SCREEN);
  });

  it('refuses before the room opens, even with a seat', () => {
    const verdict = decideWatch(room({ holdsSeat: true, now: '2026-09-21T12:00:00.000Z' }));
    expect(verdict.reason).toBe(WatchDenialReason.ROOM_NOT_OPEN);
    // They already have their seat: do not offer to sell them one.
    expect(verdict.fallback).toBe(WatchFallbackAction.NONE);
  });

  it('never lets a cancelled date be watched, even with a seat', () => {
    const verdict = decideWatch(base({ holdsSeat: true, outcome: DateOutcome.CANCELLED }));
    expect(verdict.reason).toBe(WatchDenialReason.DATE_CANCELLED);
  });

  it('shows nothing of what is not published', () => {
    for (const publicationState of [PublicationState.DRAFT, PublicationState.RESERVE]) {
      const verdict = decideWatch(base({ holdsSeat: true, publicationState, runState: null }));
      expect(verdict.reason).toBe(WatchDenialReason.NOT_PUBLISHED);
    }
  });

  it('a holder watches a date under technical check in its room (D-072)', () => {
    const verdict = decideWatch(
      room({ holdsSeat: true, publicationState: PublicationState.TECHNICAL }),
    );
    expect(verdict.allowed).toBe(true);
    expect(verdict.scope).toBe(WatchScope.FULL);
    expect(decideWatch(room({ publicationState: PublicationState.TECHNICAL })).reason).toBe(
      WatchDenialReason.NO_SEAT,
    );
  });

  it('a non-holder in the room gets the buy action, never a preview (D-110)', () => {
    const verdict = decideWatch(room({ previewSecondsLeft: 300 }));
    expect(verdict.allowed).toBe(false);
    expect(verdict.scope).toBe(WatchScope.NONE);
    expect(verdict.reason).toBe(WatchDenialReason.NO_SEAT);
    expect(verdict.fallback).toBe(WatchFallbackAction.BUY_SEAT);
    // An `all_lives` plan opens the room as a seat does: the player shows its waiting screen.
    expect(decideWatch(room({ planOpenings: [PlanOpening.ALL_LIVES] })).scope).toBe(
      WatchScope.FULL,
    );
  });

  it('a late start keeps the room open for a holder and refuses a preview', () => {
    const lateStart = { publicationState: PublicationState.LIVE, now: stillSelling };
    const holder = decideWatch(room({ ...lateStart, holdsSeat: true }));
    expect(holder.allowed).toBe(true);
    expect(holder.scope).toBe(WatchScope.FULL);

    const stranger = decideWatch(room({ ...lateStart, previewSecondsLeft: 300 }));
    expect(stranger.reason).toBe(WatchDenialReason.NO_SEAT);
    expect(stranger.fallback).toBe(WatchFallbackAction.BUY_SEAT);
    expect(decideWatch(room({ ...lateStart, now: pastCutoff })).fallback).toBe(
      WatchFallbackAction.SEE_OTHER_DATES,
    );
  });

  it('an interrupted date refuses watch.date_interrupted', () => {
    const verdict = decideWatch(base({ holdsSeat: true, outcome: DateOutcome.INTERRUPTED }));
    expect(verdict.reason).toBe(WatchDenialReason.DATE_INTERRUPTED);
    expect(verdict.fallback).toBe(WatchFallbackAction.SEE_OTHER_DATES);
  });

  it('a live that ended refuses watch.live_ended, pointing at the replay policy or at other dates', () => {
    const ended = { holdsSeat: true, runState: RunState.ENDED, now: '2026-09-21T21:05:00.000Z' };
    const withReplay = decideWatch(base(ended));
    expect(withReplay.reason).toBe(WatchDenialReason.LIVE_ENDED);
    expect(withReplay.fallback).toBe(WatchFallbackAction.SEE_REPLAY_POLICY);

    const timingNone: DateTiming = { ...timing, replayPolicy: ReplayPolicy.NONE };
    const noReplay = decideWatch(base({ ...ended, timing: timingNone }));
    expect(noReplay.reason).toBe(WatchDenialReason.LIVE_ENDED);
    expect(noReplay.fallback).toBe(WatchFallbackAction.SEE_OTHER_DATES);

    // On the clock of an unknown run too: in the replay window, and past it.
    for (const now of ['2026-09-22T10:00:00.000Z', '2026-09-25T00:00:00.000Z']) {
      const verdict = decideWatch(
        base({
          holdsSeat: true,
          publicationState: PublicationState.REPLAY_ONLINE,
          runState: null,
          now,
        }),
      );
      expect(verdict.reason).toBe(WatchDenialReason.LIVE_ENDED);
    }
  });

  it('a postponed date before its new room refuses watch.room_not_open', () => {
    const postponed = {
      outcome: DateOutcome.POSTPONED,
      timing: { ...timing, startsAt: '2026-09-28T19:00:00.000Z' },
      runState: RunState.IDLE,
      now: inTheRoom,
    };
    const holder = decideWatch(base({ ...postponed, holdsSeat: true }));
    expect(holder.reason).toBe(WatchDenialReason.ROOM_NOT_OPEN);
    expect(holder.fallback).toBe(WatchFallbackAction.NONE);
    expect(decideWatch(base(postponed)).fallback).toBe(WatchFallbackAction.BUY_SEAT);
  });

  it('a lost seat refuses watch.seat_expired, never a preview', () => {
    const onAir = decideWatch(
      base({ seatExpired: true, previewSecondsLeft: 300, now: stillSelling }),
    );
    expect(onAir.reason).toBe(WatchDenialReason.SEAT_EXPIRED);
    expect(onAir.scope).toBe(WatchScope.NONE);
    expect(onAir.fallback).toBe(WatchFallbackAction.BUY_SEAT);
    expect(decideWatch(room({ seatExpired: true })).reason).toBe(WatchDenialReason.SEAT_EXPIRED);
  });
});

describe('the seat action', () => {
  it('a notified account in its window is offered buy_seat, an account on the list none, a sold-out stranger join_waitlist, an unknown standing join_waitlist', () => {
    const facts = {
      publicSeatsAvailable: 0,
      priorityPoolSeats: 3,
      notifiedUntil: '2026-09-21T19:20:00.000Z',
      onWaitlist: true,
      now: stillSelling,
    };
    const actionFor = (seatStanding: SeatStanding | null) =>
      decideWatch(base({ previewSecondsLeft: 0, now: stillSelling, seatStanding })).fallback;

    expect(actionFor(seatStandingOf(facts))).toBe(WatchFallbackAction.BUY_SEAT);
    expect(actionFor(seatStandingOf({ ...facts, now: '2026-09-21T19:20:00.000Z' }))).toBe(
      WatchFallbackAction.NONE,
    );
    expect(actionFor(seatStandingOf({ ...facts, priorityPoolSeats: 0 }))).toBe(
      WatchFallbackAction.NONE,
    );
    expect(actionFor(seatStandingOf({ ...facts, notifiedUntil: null }))).toBe(
      WatchFallbackAction.NONE,
    );
    expect(actionFor(soldOutStranger)).toBe(WatchFallbackAction.JOIN_WAITLIST);
    expect(actionFor(null)).toBe(WatchFallbackAction.JOIN_WAITLIST);
    expect(
      actionFor(seatStandingOf({ ...facts, publicSeatsAvailable: 2, onWaitlist: false })),
    ).toBe(WatchFallbackAction.BUY_SEAT);
  });
});

/**
 * PROTECTED INVARIANT
 *   The entitlement is NEVER cached: its validity does not exceed 60 s.
 *
 * WHY
 *   It expires, it depends on territory, it depends on the screen limit. An
 *   entitlement re-read from disk is a WRONG entitlement — `storefront-mobile`,
 *   need no. 5.
 */
describe("a verdict's validity", () => {
  it('never exceeds sixty seconds', () => {
    const verdict = decideWatch(base({ holdsSeat: true }));
    const delta = Date.parse(verdict.validUntil) - Date.parse(pastCutoff);
    expect(delta).toBeLessThanOrEqual(60_000);
    expect(delta).toBeGreaterThan(0);
  });

  it('shortens when a state switch arrives sooner', () => {
    // Twenty seconds before the room opens: the entitlement's validity cannot
    // run past that switch.
    const verdict = decideWatch(room({ holdsSeat: true, now: '2026-09-21T18:29:40.000Z' }));
    expect(verdict.validUntil).toBe('2026-09-21T18:30:00.000Z');
  });
});

/**
 * PROTECTED INVARIANT
 *   Past D-089's cutoff, thirty minutes after the start, `buy_seat` is a dead
 *   end (principle no. 8): the seat sale is over, not the availability.
 */
describe('decideWatch past the seat-sales cutoff (D-089)', () => {
  it('still offers to buy a seat before the cutoff', () => {
    const verdict = decideWatch(base({ previewSecondsLeft: 0, now: stillSelling }));
    expect(verdict.fallback).toBe(WatchFallbackAction.BUY_SEAT);
  });

  it('sends to other dates once the cutoff has passed', () => {
    const verdict = decideWatch(base({ previewSecondsLeft: 0, now: pastCutoff }));
    expect(verdict.reason).toBe(WatchDenialReason.PREVIEW_EXHAUSTED);
    expect(verdict.fallback).toBe(WatchFallbackAction.SEE_OTHER_DATES);
  });

  it('sends to other dates past the cutoff even when sold out', () => {
    const verdict = decideWatch(
      base({ previewSecondsLeft: 0, seatStanding: soldOutStranger, now: pastCutoff }),
    );
    expect(verdict.fallback).toBe(WatchFallbackAction.SEE_OTHER_DATES);
  });

  it('closes the preview itself past the cutoff, not only the exhausted case', () => {
    const verdict = decideWatch(base({ previewSecondsLeft: 252, now: pastCutoff }));
    expect(verdict.allowed).toBe(true);
    expect(verdict.scope).toBe(WatchScope.PREVIEW);
    expect(verdict.fallback).toBe(WatchFallbackAction.SEE_OTHER_DATES);
  });

  it('does not touch a seat holder, who was never offered buy_seat', () => {
    const verdict = decideWatch(base({ holdsSeat: true, now: pastCutoff }));
    expect(verdict.allowed).toBe(true);
    expect(verdict.fallback).toBe(WatchFallbackAction.NONE);
  });
});

describe('the ceiling and the openings', () => {
  it("the ceiling is the seats held or the plan's, the larger (D-108)", () => {
    expect(concurrentStreamsAllowedFor([], 0)).toBe(1);
    expect(concurrentStreamsAllowedFor([PlanOpening.REPLAYS], 1)).toBe(1);
    expect(concurrentStreamsAllowedFor([PlanOpening.MULTI_SCREEN], 0)).toBe(2);
    expect(concurrentStreamsAllowedFor([PlanOpening.MULTI_SCREEN], 1)).toBe(2);
    expect(concurrentStreamsAllowedFor([], 3)).toBe(3);
    expect(concurrentStreamsAllowedFor([PlanOpening.MULTI_SCREEN], 3)).toBe(3);
  });

  it('a cancelled subscription opens until its paid period ends, a past_due one keeps its openings (D-125)', () => {
    const opens = [PlanOpening.ALL_LIVES, PlanOpening.MULTI_SCREEN];
    const paidThrough = '2026-10-01T00:00:00.000Z';
    const before = '2026-09-30T23:59:59.999Z';
    const after = '2026-10-01T00:00:00.000Z';
    for (const state of [
      SubscriptionState.ACTIVE,
      SubscriptionState.TRIALING,
      SubscriptionState.PAST_DUE,
    ]) {
      expect(planOpeningsOf({ state, opens, paidThrough }, after)).toEqual(opens);
    }
    const cancelled = { state: SubscriptionState.CANCELLED, opens, paidThrough };
    expect(planOpeningsOf(cancelled, before)).toEqual(opens);
    expect(planOpeningsOf(cancelled, after)).toEqual([]);
  });

  it('a final payment failure opens nothing past what was paid, whatever period the provider opened', () => {
    const opens = [PlanOpening.ALL_LIVES, PlanOpening.MULTI_SCREEN];
    // The renewal opened October, never paid: past_due while retried, then cancelled.
    const paidThrough = '2026-10-01T00:00:00.000Z';
    const inTheUnpaidPeriod = '2026-10-12T00:00:00.000Z';
    expect(
      planOpeningsOf({ state: SubscriptionState.PAST_DUE, opens, paidThrough }, inTheUnpaidPeriod),
    ).toEqual(opens);
    expect(
      planOpeningsOf({ state: SubscriptionState.CANCELLED, opens, paidThrough }, inTheUnpaidPeriod),
    ).toEqual([]);
    // Cancelled during a trial: nothing was paid.
    expect(
      planOpeningsOf(
        { state: SubscriptionState.CANCELLED, opens, paidThrough: null },
        '2026-09-15T00:00:00.000Z',
      ),
    ).toEqual([]);
  });

  it('clamps the preview budget at zero, never below', () => {
    expect(previewSecondsLeft(0)).toBe(300);
    expect(previewSecondsLeft(48)).toBe(252);
    expect(previewSecondsLeft(9_999)).toBe(0);
  });
});

/**
 * PROTECTED INVARIANT
 *   Every refusal carries a way out, and every way out answers a refusal.
 *
 * WHY THIS TEST EXISTS
 *   `adr-stream-entitlement.md` §3.3 and principle no. 8: a bare refusal leaves
 *   the viewer with no way out. That is checkable rather than a matter of taste
 *   BECAUSE the two vocabularies are coupled — a fallback action exists to
 *   answer a denial reason.
 *
 *   It is also how the merge with the contract was settled. Core had
 *   `see_other_dates` and `release_a_screen`; the contract had `join_waitlist`,
 *   `see_replay_policy` and `watch_preview`. The union was not the answer: the
 *   test below is, and `watch_preview` failed it — a preview still available is
 *   an ALLOWED verdict with `scope: 'preview'`, not a dead end.
 */
describe('every refusal has a way out, and every way out answers a refusal', () => {
  it('pairs every denial reason with at least one action', () => {
    for (const reason of WATCH_DENIAL_REASONS) {
      expect(WATCH_FALLBACK_FOR[reason].length).toBeGreaterThan(0);
    }
  });

  it('leaves no action without a refusal to answer', () => {
    const used = new Set(Object.values(WATCH_FALLBACK_FOR).flat());
    for (const action of WATCH_FALLBACK_ACTIONS) {
      expect(used.has(action)).toBe(true);
    }
  });

  it("the fallback table is the function's exact range", () => {
    // The replay's verdict returns these four (adr-replay.md §10); decideWatch returns every other.
    const replayVerdictReasons: readonly WatchDenialReason[] = [
      WatchDenialReason.SUBSCRIPTION_REQUIRED,
      WatchDenialReason.NO_REPLAY,
      WatchDenialReason.REPLAY_EXPIRED,
      WatchDenialReason.REPLAY_NOT_ON_SALE,
    ];
    const produced = new Map<WatchDenialReason, Set<WatchFallbackAction>>();
    const record = (input: WatchInput): void => {
      const verdict = decideWatch(input);
      if (verdict.reason === null) return;
      const actions = produced.get(verdict.reason) ?? new Set<WatchFallbackAction>();
      actions.add(verdict.fallback);
      produced.set(verdict.reason, actions);
    };

    record(
      base({ viewerCountry: 'BE', rights: restrictedRights(['BE'], BlackoutReason.FESTIVAL) }),
    );
    record(base({ concurrentStreamsOpen: 1, concurrentStreamsAllowed: 1 }));
    const nows = [
      '2026-09-21T12:00:00.000Z',
      inTheRoom,
      stillSelling,
      '2026-09-21T19:45:00.000Z',
      '2026-09-21T21:30:00.000Z',
      '2026-09-25T00:00:00.000Z',
    ];
    const seats: readonly Partial<WatchInput>[] = [
      { holdsSeat: true },
      { seatExpired: true },
      {},
      { planOpenings: [PlanOpening.ALL_LIVES] },
    ];
    for (const now of nows)
      for (const runState of [null, ...Object.values(RunState)])
        for (const publicationState of Object.values(PublicationState))
          for (const outcome of [null, ...Object.values(DateOutcome)])
            for (const seat of seats)
              for (const previewSecondsLeft of [0, 300])
                for (const seatStanding of [onPublicSale, soldOutStranger, onTheList, null])
                  for (const replayPolicy of [ReplayPolicy.INCLUDED, ReplayPolicy.NONE])
                    record(
                      base({
                        now,
                        runState,
                        publicationState,
                        outcome,
                        ...seat,
                        previewSecondsLeft,
                        seatStanding,
                        timing: { ...timing, replayPolicy },
                      }),
                    );

    expect(new Set(produced.keys())).toEqual(
      new Set(WATCH_DENIAL_REASONS.filter((reason) => !replayVerdictReasons.includes(reason))),
    );
    for (const [reason, actions] of produced) {
      expect(actions).toEqual(new Set(WATCH_FALLBACK_FOR[reason]));
    }
  });
});
