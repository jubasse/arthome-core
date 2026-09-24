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
  previewSecondsLeft,
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
import { PlanOpening } from '../vocabulary/commerce.js';

const timing: DateTiming = {
  startsAt: '2026-09-21T19:00:00.000Z',
  runtimeMin: 120,
  roomOpensBeforeMin: 30,
  replayPolicy: ReplayPolicy.INCLUDED,
  replayWindowHours: 48,
};

const base = (over: Partial<WatchInput> = {}): WatchInput => ({
  holdsSeat: false,
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
  replayOnSale: false,
  waitlistOpen: false,
  now: '2026-09-21T19:30:00.000Z',
  ...over,
});

/**
 * PROTECTED INVARIANT
 *   One verdict, five inputs, and THE SAME refusal vocabulary on both sides —
 *   at display time as at player-open time.
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
    expect(verdict.scope).toBe('full');
  });

  it('opens a bounded PREVIEW to someone with no seat', () => {
    const verdict = decideWatch(base({ previewSecondsLeft: 252 }));
    expect(verdict.allowed).toBe(true);
    expect(verdict.scope).toBe('preview');
    expect(verdict.previewSecondsLeft).toBe(252);
    expect(verdict.fallback).toBe(WatchFallbackAction.BUY_SEAT);
  });

  it('refuses when the preview is exhausted, with the way out', () => {
    const verdict = decideWatch(base({ previewSecondsLeft: 0 }));
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
    const verdict = decideWatch(
      base({
        holdsSeat: true,
        runState: RunState.IDLE,
        publicationState: PublicationState.SCHEDULED,
        now: '2026-09-21T12:00:00.000Z',
      }),
    );
    expect(verdict.reason).toBe(WatchDenialReason.ROOM_NOT_OPEN);
    // They already have their seat: do not offer to sell them one.
    expect(verdict.fallback).toBe(WatchFallbackAction.NONE);
  });

  it('never lets a cancelled date be watched, even with a seat', () => {
    const verdict = decideWatch(base({ holdsSeat: true, outcome: DateOutcome.CANCELLED }));
    expect(verdict.reason).toBe(WatchDenialReason.DATE_CANCELLED);
  });

  it('shows nothing of what is not published', () => {
    const verdict = decideWatch(
      base({ holdsSeat: true, publicationState: PublicationState.DRAFT, runState: null }),
    );
    expect(verdict.reason).toBe(WatchDenialReason.NOT_PUBLISHED);
  });
});

/**
 * PROTECTED INVARIANT
 *   The four replay policies produce FOUR distinct refusals.
 *
 * WHY
 *   `storefront-tv` lists them separately: "no replay for this date" and
 *   "replay expired" are two screens, "subscription required" is a third. A
 *   generic code would produce a wrong one.
 */
describe('decideWatch — the four replay policies', () => {
  const replayNow = '2026-09-22T10:00:00.000Z';
  const replay = (over: Partial<WatchInput> = {}): WatchInput =>
    base({
      publicationState: PublicationState.REPLAY_ONLINE,
      runState: null,
      now: replayNow,
      ...over,
    });

  it('INCLUDED: a held seat opens the replay', () => {
    expect(decideWatch(replay({ holdsSeat: true })).allowed).toBe(true);
    expect(decideWatch(replay({ holdsSeat: false })).reason).toBe(WatchDenialReason.NO_SEAT);
  });

  it('SUBSCRIPTION: the plan opens it, otherwise we offer to subscribe', () => {
    const timingSub: DateTiming = { ...timing, replayPolicy: ReplayPolicy.SUBSCRIPTION };
    expect(
      decideWatch(replay({ timing: timingSub, planOpenings: [PlanOpening.REPLAYS] })).allowed,
    ).toBe(true);
    // The way out is to subscribe, whether or not preview budget remains. A
    // `watch_preview` action was proposed for the budget-remaining case and
    // withdrawn: a viewer who can still watch a preview is not REFUSED, the
    // verdict allows them, so it answered no reason. What it was compensating
    // for was a missing FIELD — `WatchVerdict.scope`, which now carries
    // preview-ness instead of three storefronts inferring it from
    // `previewSecondsLeft > 0`.
    const refused = decideWatch(replay({ timing: timingSub, planOpenings: [] }));
    expect(refused.reason).toBe(WatchDenialReason.SUBSCRIPTION_REQUIRED);
    expect(refused.fallback).toBe(WatchFallbackAction.SUBSCRIBE);
    expect(refused.scope).toBe(WatchScope.NONE);
  });

  it('UNIT: tells "not bought" apart from "not on sale"', () => {
    const timingUnit: DateTiming = { ...timing, replayPolicy: ReplayPolicy.UNIT };
    expect(decideWatch(replay({ timing: timingUnit, replayOnSale: true })).reason).toBe(
      WatchDenialReason.NO_SEAT,
    );
    expect(decideWatch(replay({ timing: timingUnit, replayOnSale: false })).reason).toBe(
      WatchDenialReason.REPLAY_NOT_ON_SALE,
    );
  });

  it('NONE: no replay, and that is not "expired"', () => {
    const timingNone: DateTiming = {
      ...timing,
      replayPolicy: ReplayPolicy.NONE,
      replayWindowHours: 0,
    };
    const verdict = decideWatch(
      replay({ timing: timingNone, holdsSeat: true, now: '2026-09-21T23:00:00.000Z' }),
    );
    expect(verdict.reason).toBe(WatchDenialReason.NO_REPLAY);
  });

  it('tells "expired" apart from "none" once the window has passed', () => {
    const verdict = decideWatch(replay({ holdsSeat: true, now: '2026-09-25T00:00:00.000Z' }));
    expect(verdict.reason).toBe(WatchDenialReason.REPLAY_EXPIRED);
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
    const delta = Date.parse(verdict.validUntil) - Date.parse('2026-09-21T19:30:00.000Z');
    expect(delta).toBeLessThanOrEqual(60_000);
    expect(delta).toBeGreaterThan(0);
  });

  it('shortens when a state switch arrives sooner', () => {
    // Twenty seconds before the room opens: the entitlement's validity cannot
    // run past that switch.
    const verdict = decideWatch(
      base({
        holdsSeat: true,
        runState: RunState.IDLE,
        publicationState: PublicationState.SCHEDULED,
        now: '2026-09-21T18:29:40.000Z',
      }),
    );
    expect(verdict.validUntil).toBe('2026-09-21T18:30:00.000Z');
  });
});

describe('the two constants derived from the plan', () => {
  it('gives two screens to `multi-screen`, one otherwise', () => {
    expect(concurrentStreamsAllowedFor([PlanOpening.MULTI_SCREEN])).toBe(2);
    expect(concurrentStreamsAllowedFor([PlanOpening.REPLAYS])).toBe(1);
    expect(concurrentStreamsAllowedFor([])).toBe(1);
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

  it('never returns an action the pairing does not allow for that reason', () => {
    // The table is not documentation: decideWatch is held to it.
    const cases: readonly WatchInput[] = [
      base({ viewerCountry: 'BE', rights: restrictedRights(['BE'], BlackoutReason.CO_PRODUCTION) }),
      base({ holdsSeat: true, outcome: DateOutcome.CANCELLED }),
      base({ holdsSeat: true, publicationState: PublicationState.DRAFT, runState: null }),
      base({ holdsSeat: true, concurrentStreamsOpen: 1, concurrentStreamsAllowed: 1 }),
      base({ previewSecondsLeft: 0 }),
      base({ previewSecondsLeft: 0, waitlistOpen: true }),
      base({
        runState: RunState.IDLE,
        publicationState: PublicationState.SCHEDULED,
        now: '2026-09-21T12:00:00.000Z',
      }),
    ];
    for (const input of cases) {
      const verdict = decideWatch(input);
      if (verdict.allowed || verdict.reason === null) continue;
      expect(WATCH_FALLBACK_FOR[verdict.reason]).toContain(verdict.fallback);
    }
  });

  it('offers the waiting list instead of a seat when the date is sold out', () => {
    // Offering `buy_seat` on a sold-out date is a button that leads nowhere —
    // which is the dead end principle no. 8 forbids, dressed as an action.
    expect(decideWatch(base({ previewSecondsLeft: 0 })).fallback).toBe(
      WatchFallbackAction.BUY_SEAT,
    );
    expect(decideWatch(base({ previewSecondsLeft: 0, waitlistOpen: true })).fallback).toBe(
      WatchFallbackAction.JOIN_WAITLIST,
    );
  });

  it('explains the promise rather than deflecting when there is no replay', () => {
    // `see_other_dates` answered this once, and it answered the wrong question:
    // the viewer is not looking for another date, they are asking why this one
    // has no replay. The policy is the answer (`catalog` owns the promise).
    const noReplay = decideWatch(
      base({
        timing: { ...timing, replayPolicy: ReplayPolicy.NONE, replayWindowHours: 0 },
        holdsSeat: true,
        publicationState: PublicationState.REPLAY_ONLINE,
        runState: null,
        now: '2026-09-21T23:00:00.000Z',
      }),
    );
    expect(noReplay.reason).toBe(WatchDenialReason.NO_REPLAY);
    expect(noReplay.fallback).toBe(WatchFallbackAction.SEE_REPLAY_POLICY);
  });
});
