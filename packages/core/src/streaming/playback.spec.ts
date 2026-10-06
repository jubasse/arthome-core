import { describe, expect, it } from 'vitest';

import {
  PLAYBACK_LEASE_SECONDS,
  PLAYBACK_RENEWAL_INTERVAL_SECONDS,
  PLAYBACK_TOKEN_LIFETIME_SECONDS,
  isPreviewBudgetSpending,
  playbackLeaseExpiresAt,
  playbackTokenExpiresAt,
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

  it('a preview token never outlives the budget while spending', () => {
    expect(previewTokenExpiresAt(now, 30, true)).toBe(plusSeconds(now, 30));
    expect(previewTokenExpiresAt(now, 0, true)).toBe(now);
    expect(previewTokenExpiresAt(now, 9_999, true)).toBe(playbackTokenExpiresAt(now));
    // Under the veil nothing is spent, so the budget does not bound the token.
    expect(previewTokenExpiresAt(now, 30, false)).toBe(playbackTokenExpiresAt(now));
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
