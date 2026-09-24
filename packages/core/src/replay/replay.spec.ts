import { describe, expect, it } from 'vitest';

import { isReplayWindowOpen, replayHoursLeft, replayUnavailabilityReason } from './index.js';
import type { DateTiming } from '../catalog/date-state.js';
import { ReplayPolicy } from '../vocabulary/catalog.js';
import { WatchDenialReason } from '../vocabulary/entitlement.js';

const timing: DateTiming = {
  startsAt: '2026-09-21T19:00:00.000Z',
  runtimeMin: 120,
  roomOpensBeforeMin: 30,
  replayPolicy: ReplayPolicy.INCLUDED,
  replayWindowHours: 48,
};

/**
 * PROTECTED INVARIANT
 *   The replay window runs from the END of the live show, never from the start.
 *   And the hours remaining are DERIVED: the contract delivers the inputs, not
 *   the result.
 *
 * WHY
 *   `storefront-tv`: "if the server delivered the hour count, it would be wrong
 *   a minute later". It is the canonical example of the "no value computed
 *   twice" rule — and of its resolution: one rule, an explicit `now`, two call
 *   sites.
 */
describe('the replay window', () => {
  it('runs from the end of the live show, not from the start', () => {
    // Ends at 21:00 + 48 h = 23 September 21:00. From the START it would be 19:00.
    expect(replayHoursLeft(timing, '2026-09-23T20:00:00.000Z')).toBe(1);
    expect(replayHoursLeft(timing, '2026-09-23T21:00:00.000Z')).toBe(0);
  });

  it('rounds UP, so it never promises less than is left', () => {
    // 30 minutes are left: announcing "0 h" would be wrong and discouraging.
    expect(replayHoursLeft(timing, '2026-09-23T20:30:00.000Z')).toBe(1);
  });

  it('never returns a negative number', () => {
    expect(replayHoursLeft(timing, '2026-10-01T00:00:00.000Z')).toBe(0);
  });

  it('returns zero when the policy forbids a replay', () => {
    const none: DateTiming = { ...timing, replayPolicy: ReplayPolicy.NONE, replayWindowHours: 0 };
    expect(replayHoursLeft(none, '2026-09-21T22:00:00.000Z')).toBe(0);
    expect(isReplayWindowOpen(none, '2026-09-21T22:00:00.000Z')).toBe(false);
  });

  it('crosses a daylight-saving change without drifting', () => {
    // A 200 h window — the longest in the data set — placed over the last
    // weekend of October. The computation is in INSTANTS, so it is immune to
    // the daylight-saving change: precisely what a frozen offset did not
    // guarantee (D3).
    const long: DateTiming = {
      ...timing,
      startsAt: '2026-10-23T19:00:00.000Z',
      replayWindowHours: 200,
    };
    // Ends 23 Oct 21:00 + 200 h = 1 Nov 05:00 UTC, whatever the time zone.
    expect(replayHoursLeft(long, '2026-11-01T04:00:00.000Z')).toBe(1);
    expect(replayHoursLeft(long, '2026-11-01T05:00:00.000Z')).toBe(0);
  });
});

/**
 * PROTECTED INVARIANT
 *   "No replay for this date" and "replay expired" are TWO distinct refusals.
 *
 * WHY
 *   `storefront-tv` lists them separately among the error codes it must be able
 *   to tell apart: each produces a different screen, and a generic code would
 *   produce a wrong one.
 */
describe('the two replay refusals', () => {
  it('tells an absent policy apart from a closed window', () => {
    const none: DateTiming = { ...timing, replayPolicy: ReplayPolicy.NONE, replayWindowHours: 0 };
    expect(replayUnavailabilityReason(none, '2026-09-21T22:00:00.000Z')).toBe(
      WatchDenialReason.NO_REPLAY,
    );
    expect(replayUnavailabilityReason(timing, '2026-10-01T00:00:00.000Z')).toBe(
      WatchDenialReason.REPLAY_EXPIRED,
    );
  });

  it('returns null when available — the absence of a reason IS availability', () => {
    expect(replayUnavailabilityReason(timing, '2026-09-22T10:00:00.000Z')).toBeNull();
  });
});
