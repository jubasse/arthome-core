/**
 * The replay as the VIEWER sees it: how much time is left, and whether they can
 * watch. The context map puts the policy and the window in `catalog` (a promise
 * made before the purchase, which is what justifies the price difference), the
 * sale in `ticketing`, and the file with its expiry in `streaming`.
 */

import { replayEndsAt, type DateTiming } from '../catalog/date-state.js';
import type { Instant } from '../kernel/clock.js';
import { minutesBetween } from '../time/instant.js';
import { ReplayPolicy } from '../vocabulary/catalog.js';
import { WatchDenialReason } from '../vocabulary/entitlement.js';

/**
 * The replay hours remaining — a DECREASING value.
 *
 * DERIVED: the contract delivers the end instant and the window, not a count
 * that would be wrong a minute later — hence the explicit `now`.
 */
export function replayHoursLeft(timing: DateTiming, now: Instant): number {
  const endsAtInstant = replayEndsAt(timing);
  if (endsAtInstant === null) return 0;
  const minutes = minutesBetween(now, endsAtInstant);
  return minutes <= 0 ? 0 : Math.ceil(minutes / 60);
}

/** Is the replay STILL online? Distinct from whether one exists: two different screens. */
export function isReplayWindowOpen(timing: DateTiming, now: Instant): boolean {
  return replayHoursLeft(timing, now) > 0;
}

/** Does the date promise a replay at all, whatever the window? */
export function hasReplayPolicy(timing: DateTiming): boolean {
  return timing.replayPolicy !== ReplayPolicy.NONE;
}

/** Is the replay paid for separately? `unit` is the only policy with its own price. */
export function isReplaySoldSeparately(timing: DateTiming): boolean {
  return timing.replayPolicy === ReplayPolicy.UNIT;
}

/** The full diagnosis, in one pass. `null` is availability, so nothing needs a second call. */
export function replayUnavailabilityReason(
  timing: DateTiming,
  now: Instant,
): WatchDenialReason | null {
  if (!hasReplayPolicy(timing)) return WatchDenialReason.NO_REPLAY;
  if (!isReplayWindowOpen(timing, now)) return WatchDenialReason.REPLAY_EXPIRED;
  return null;
}
