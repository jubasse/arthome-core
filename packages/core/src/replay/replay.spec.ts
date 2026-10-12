import { describe, expect, it } from 'vitest';

import {
  assertReplayGoesOnline,
  createsReplayOnLiveEnd,
  grantsReplayOnLiveEnd,
  isReplayWindowOpen,
  outcomeWithdrawsReplay,
  replayClosesAt,
  replayHoursLeft,
  replayUnavailabilityReason,
} from './index.js';
import type { DateTiming } from '../catalog/date-state.js';
import { isDomainError } from '../kernel/errors.js';
import { DateOutcome, ReplayPolicy, ReplayState } from '../vocabulary/catalog.js';
import { WatchDenialReason } from '../vocabulary/entitlement.js';
import { CatalogErrorCode } from '../vocabulary/error-codes.js';

const timing: DateTiming = {
  startsAt: '2026-09-21T19:00:00.000Z',
  runtimeMin: 120,
  roomOpensBeforeMin: 30,
  replayPolicy: ReplayPolicy.INCLUDED,
  replayWindowHours: 48,
};

describe('the replay window', () => {
  it('runs from the end of the live show, not from the start', () => {
    // Ends at 21:00 + 48 h = 23 September 21:00. From the START it would be 19:00.
    expect(replayHoursLeft(timing, '2026-09-23T20:00:00.000Z')).toBe(1);
    expect(replayHoursLeft(timing, '2026-09-23T21:00:00.000Z')).toBe(0);
  });

  it('rounds UP, so it never promises less than is left', () => {
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
    // A 200 h window — the longest in the data set — over the last weekend of
    // October: the computation is in INSTANTS, so the DST change cannot drift it (D3).
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

describe('the replay asset (D-092, D-113)', () => {
  it("closes the window from the live's real end, an overrun included", () => {
    expect(replayClosesAt('2026-09-21T21:40:00.000Z', 48)).toBe('2026-09-23T21:40:00.000Z');
  });

  it('withdraws the replay of a cancelled or interrupted date, not of a postponed one', () => {
    expect(outcomeWithdrawsReplay(DateOutcome.CANCELLED)).toBe(true);
    expect(outcomeWithdrawsReplay(DateOutcome.INTERRUPTED)).toBe(true);
    expect(outcomeWithdrawsReplay(DateOutcome.POSTPONED)).toBe(false);
    expect(outcomeWithdrawsReplay(null)).toBe(false);
  });
});

describe("the Replay at the live's end (adr-replay.md §5, §8)", () => {
  it('creates a Replay for a promised replay with a window, unless an outcome withdrew it', () => {
    expect(createsReplayOnLiveEnd(ReplayPolicy.NONE, 48, null)).toBe(false);
    expect(createsReplayOnLiveEnd(ReplayPolicy.INCLUDED, 0, null)).toBe(false);
    expect(createsReplayOnLiveEnd(ReplayPolicy.INCLUDED, 48, DateOutcome.INTERRUPTED)).toBe(false);
    expect(createsReplayOnLiveEnd(ReplayPolicy.INCLUDED, 48, DateOutcome.CANCELLED)).toBe(false);
    expect(createsReplayOnLiveEnd(ReplayPolicy.INCLUDED, 48, DateOutcome.POSTPONED)).toBe(true);
    expect(createsReplayOnLiveEnd(ReplayPolicy.INCLUDED, 48, null)).toBe(true);
  });

  it('grants the seat holders their accesses under included alone, unless withdrawn', () => {
    expect(grantsReplayOnLiveEnd(ReplayPolicy.INCLUDED, 48, null)).toBe(true);
    expect(grantsReplayOnLiveEnd(ReplayPolicy.INCLUDED, 48, DateOutcome.POSTPONED)).toBe(true);
    for (const policy of [ReplayPolicy.UNIT, ReplayPolicy.SUBSCRIPTION, ReplayPolicy.NONE]) {
      expect(grantsReplayOnLiveEnd(policy, 48, null)).toBe(false);
    }
    expect(grantsReplayOnLiveEnd(ReplayPolicy.INCLUDED, 48, DateOutcome.INTERRUPTED)).toBe(false);
    expect(grantsReplayOnLiveEnd(ReplayPolicy.INCLUDED, 48, DateOutcome.CANCELLED)).toBe(false);
  });

  it('grants nothing where no Replay is created, a zero window included', () => {
    expect(grantsReplayOnLiveEnd(ReplayPolicy.INCLUDED, 0, null)).toBe(false);
  });
});

describe('assertReplayGoesOnline — the guard of ended -> replay_online', () => {
  function refusalOf(check: () => void): unknown {
    try {
      check();
    } catch (error) {
      if (isDomainError(error)) return { code: error.code, params: error.params };
      throw error;
    }
    return null;
  }

  it('refuses a date with no Replay', () => {
    expect(refusalOf(() => assertReplayGoesOnline(null))).toEqual({
      code: CatalogErrorCode.REPLAY_UNAVAILABLE,
      params: { replayState: null },
    });
  });

  it('refuses a pending Replay whose file has not arrived', () => {
    expect(
      refusalOf(() => assertReplayGoesOnline({ state: ReplayState.PENDING, assetReady: false })),
    ).toEqual({ code: CatalogErrorCode.REPLAY_ASSET_NOT_READY, params: {} });
  });

  it('accepts a pending Replay with its file', () => {
    expect(
      refusalOf(() => assertReplayGoesOnline({ state: ReplayState.PENDING, assetReady: true })),
    ).toBeNull();
  });

  it('refuses a pending Replay past its closesAt as closed, the sweeper not having run', () => {
    const closesAt = '2026-09-23T21:10:00.000Z';
    expect(
      refusalOf(() =>
        assertReplayGoesOnline({
          state: ReplayState.PENDING,
          assetReady: true,
          closing: { closesAt, now: closesAt },
        }),
      ),
    ).toEqual({
      code: CatalogErrorCode.REPLAY_UNAVAILABLE,
      params: { replayState: ReplayState.CLOSED },
    });
    expect(
      refusalOf(() =>
        assertReplayGoesOnline({
          state: ReplayState.PENDING,
          assetReady: true,
          closing: { closesAt, now: '2026-09-23T21:09:59.999Z' },
        }),
      ),
    ).toBeNull();
  });

  it('refuses a Replay already online, closed or withdrawn, naming its state', () => {
    for (const state of [ReplayState.ONLINE, ReplayState.CLOSED, ReplayState.WITHDRAWN]) {
      expect(refusalOf(() => assertReplayGoesOnline({ state, assetReady: true }))).toEqual({
        code: CatalogErrorCode.REPLAY_UNAVAILABLE,
        params: { replayState: state },
      });
    }
  });
});
