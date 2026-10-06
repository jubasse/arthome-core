import { describe, expect, it } from 'vitest';

import {
  PLAYBACK_LEASE_SECONDS,
  PLAYBACK_RENEWAL_INTERVAL_SECONDS,
  PLAYBACK_TOKEN_LIFETIME_SECONDS,
  isPreviewBudgetSpending,
  playbackLeaseExpiresAt,
  playbackTokenExpiresAt,
  previewRenewAfterSeconds,
  previewSecondsSpent,
  previewTokenExpiresAt,
} from './index.js';
import { plusSeconds, windowOf } from '../time/instant.js';
import { RUN_STATES, RunState } from '../vocabulary/catalog.js';

const now = '2026-09-21T19:30:00.000Z';

describe('the playback timings', () => {
  it('the token and the lease expire from now, the renewal well inside both', () => {
    expect(playbackTokenExpiresAt(now)).toBe(plusSeconds(now, PLAYBACK_TOKEN_LIFETIME_SECONDS));
    expect(playbackLeaseExpiresAt(now)).toBe(plusSeconds(now, PLAYBACK_LEASE_SECONDS));
    expect(PLAYBACK_RENEWAL_INTERVAL_SECONDS).toBeLessThan(PLAYBACK_LEASE_SECONDS);
    expect(PLAYBACK_LEASE_SECONDS).toBeLessThan(PLAYBACK_TOKEN_LIFETIME_SECONDS);
  });
});

describe('the preview budget (D-110)', () => {
  it('the preview is spent on air only', () => {
    for (const state of RUN_STATES) {
      expect(isPreviewBudgetSpending(state)).toBe(state === RunState.ON_AIR);
    }
  });

  it('a preview token never outlives the budget, under the veil too', () => {
    expect(previewTokenExpiresAt(now, 30)).toBe(plusSeconds(now, 30));
    expect(previewTokenExpiresAt(now, 0)).toBe(now);
    expect(previewTokenExpiresAt(now, 9_999)).toBe(playbackTokenExpiresAt(now));
  });

  it('a veil lifting mid-token opens no on-air second past the budget', () => {
    // Minted under the veil with five seconds left; the run goes back on air one second later.
    const secondsLeft = 5;
    const token = windowOf(now, previewTokenExpiresAt(now, secondsLeft));
    const backOnAir = [windowOf(plusSeconds(now, 1), '2026-09-21T21:00:00.000Z')];
    expect(previewSecondsSpent(token, backOnAir)).toBeLessThanOrEqual(secondsLeft);
    // An uncapped token would have opened the rest of its lifetime on air.
    const uncapped = windowOf(now, playbackTokenExpiresAt(now));
    expect(previewSecondsSpent(uncapped, backOnAir)).toBeGreaterThan(secondsLeft);
  });

  it('a preview player renews before its token expires', () => {
    expect(previewRenewAfterSeconds(5)).toBe(5);
    expect(previewRenewAfterSeconds(9_999)).toBe(PLAYBACK_RENEWAL_INTERVAL_SECONDS);
    expect(previewRenewAfterSeconds(-3)).toBe(0);
    for (const secondsLeft of [1, 30, 45, 300]) {
      expect(
        Date.parse(plusSeconds(now, previewRenewAfterSeconds(secondsLeft))),
      ).toBeLessThanOrEqual(Date.parse(previewTokenExpiresAt(now, secondsLeft)));
    }
  });

  it('seconds spent count only the on-air intervals', () => {
    const watched = windowOf('2026-09-21T19:30:00.000Z', '2026-09-21T19:32:00.000Z');
    const onAir = [
      windowOf('2026-09-21T19:00:00.000Z', '2026-09-21T19:30:40.500Z'),
      // An incident veil from 19:30:40.500 to 19:31:30.
      windowOf('2026-09-21T19:31:30.000Z', '2026-09-21T21:00:00.000Z'),
    ];
    expect(previewSecondsSpent(watched, onAir)).toBe(70);
    expect(previewSecondsSpent(watched, [])).toBe(0);
  });
});
