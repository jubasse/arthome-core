import type { Instant } from '../kernel/clock.js';
import { earliest, plusSeconds, toEpochMs, type Window } from '../time/instant.js';
import { RunState } from '../vocabulary/catalog.js';

/** A playback token's lifetime: the edge may serve a revoked viewer for up to this long (D-020). */
export const PLAYBACK_TOKEN_LIFETIME_SECONDS = 120;

/** How often a player renews its token, so a client learns within it that it lost the right (`adr-stream-entitlement.md` §3.1). */
export const PLAYBACK_RENEWAL_INTERVAL_SECONDS = 45;

/** A lease's lifetime, extended by each renewal: a screen that vanished frees its place within it (`adr-stream-entitlement.md` §3.3). */
export const PLAYBACK_LEASE_SECONDS = 90;

/** The freshness `streaming`'s entitlement projection tolerates before `read_model_staleness_seconds` fires (`adr-stream-entitlement.md` §5). */
export const ENTITLEMENT_PROJECTION_MAX_STALENESS_SECONDS = 5;

export function playbackTokenExpiresAt(now: Instant): Instant {
  return plusSeconds(now, PLAYBACK_TOKEN_LIFETIME_SECONDS);
}

export function playbackLeaseExpiresAt(now: Instant): Instant {
  return plusSeconds(now, PLAYBACK_LEASE_SECONDS);
}

// D-110: an `interrupted` run is the incident veil, and a veiled preview costs nothing.
const PREVIEW_BUDGET_SPENT_WHILE: Readonly<Record<RunState, boolean>> = {
  [RunState.IDLE]: false,
  [RunState.REHEARSAL]: false,
  [RunState.ON_AIR]: true,
  [RunState.INTERRUPTED]: false,
  [RunState.ENDED]: false,
};

export function isPreviewBudgetSpending(runState: RunState): boolean {
  return PREVIEW_BUDGET_SPENT_WHILE[runState];
}

/** The whole seconds of `watched` that fall inside the run's `on_air` intervals: what the preview budget is charged. */
export function previewSecondsSpent(watched: Window, onAirIntervals: readonly Window[]): number {
  const watchedStart = toEpochMs(watched.start);
  const watchedEnd = toEpochMs(watched.end);
  let insideMs = 0;
  for (const interval of onAirIntervals) {
    const start = Math.max(watchedStart, toEpochMs(interval.start));
    const end = Math.min(watchedEnd, toEpochMs(interval.end));
    if (end > start) insideMs += end - start;
  }
  return Math.floor(insideMs / 1000);
}

/**
 * A preview token's expiry: never past the budget left, under the incident veil too, so a veil
 * lifting mid-token opens no on-air second the budget does not cover (`adr-stream-entitlement.md` §4).
 */
export function previewTokenExpiresAt(now: Instant, previewSecondsLeft: number): Instant {
  return earliest(playbackTokenExpiresAt(now), plusSeconds(now, Math.max(0, previewSecondsLeft)));
}

/** A preview ticket's `renewAfterSec`: never past its token's expiry, so a long veil renews rather than stalls. */
export function previewRenewAfterSeconds(previewSecondsLeft: number): number {
  return Math.min(PLAYBACK_RENEWAL_INTERVAL_SECONDS, Math.max(0, previewSecondsLeft));
}
