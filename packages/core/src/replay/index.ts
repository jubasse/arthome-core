/**
 * The replay: the PROMISE, the window, and what is left of it.
 *
 * The split between this module and `catalog/date-state` is not arbitrary; it
 * follows the context map:
 *   - the POLICY and the WINDOW belong to `catalog` — it is the promise made
 *     BEFORE THE PURCHASE, and the file makes that a principle: it is what
 *     justifies the price difference;
 *   - PUTTING IT ON SALE belongs to `ticketing` — the price when the policy is
 *     `unit`;
 *   - the FILE and its expiry belong to `streaming`.
 *
 * This module carries what the VIEWER sees of it: how much time they have left,
 * and whether they can watch.
 */

import type { Instant } from '../kernel/clock.js';
import { minutesBetween } from '../time/instant.js';
import { ReplayPolicy } from '../vocabulary/catalog.js';
import { replayEndsAt, type DateTiming } from '../catalog/date-state.js';

/**
 * The replay hours remaining — a DECREASING value.
 *
 * ⚠ This is the canonical example of the "no value computed twice" rule, and
 * `storefront-tv` put it better than I did:
 *
 *   "The hours remaining are DERIVED from the end instant and the window, so
 *    the contract delivers the two inputs, not the result. If the server
 *    delivered the hour count, it would be wrong a minute later."
 *
 * Hence the shape: the function takes an EXPLICIT `now`. The server calls it
 * with its instant and serves the result WITH its inputs; the surface calls it
 * again with the server instant corrected for its own offset. One rule, two
 * calls, no reimplementation.
 */
export function replayHoursLeft(timing: DateTiming, now: Instant): number {
  const endsAtInstant = replayEndsAt(timing);
  if (endsAtInstant === null) return 0;
  const minutes = minutesBetween(now, endsAtInstant);
  return minutes <= 0 ? 0 : Math.ceil(minutes / 60);
}

/**
 * Is the replay STILL online?
 *
 * Distinct from "does a replay exist": a date can have an `included` policy and
 * an expired window. `storefront-tv` insists the two refusals be
 * distinguishable — "no replay for this date" and "replay expired" are two
 * different screens.
 */
export function isReplayWindowOpen(timing: DateTiming, now: Instant): boolean {
  return replayHoursLeft(timing, now) > 0;
}

/** Does the date promise a replay at all, whatever the window? */
export function hasReplayPolicy(timing: DateTiming): boolean {
  return timing.replayPolicy !== ReplayPolicy.NONE;
}

/**
 * Is the replay paid for separately?
 *
 * `unit` is the only policy that asks `ticketing` for a price. `included` and
 * `subscription` open on an entitlement already held.
 */
export function isReplaySoldSeparately(timing: DateTiming): boolean {
  return timing.replayPolicy === ReplayPolicy.UNIT;
}

/** Why the replay is not watchable — as a CODE. */
export const REPLAY_UNAVAILABILITY_REASONS = ['no_replay_policy', 'replay_window_expired'] as const;
export type ReplayUnavailabilityReason = (typeof REPLAY_UNAVAILABILITY_REASONS)[number];

export const ReplayUnavailabilityReason = {
  NO_POLICY: 'no_replay_policy',
  WINDOW_EXPIRED: 'replay_window_expired',
} as const;

/**
 * The full diagnosis, in one pass.
 *
 * Returns `null` when the replay is available — the absence of a reason IS
 * availability, which avoids a second call to find out why.
 */
export function replayUnavailabilityReason(
  timing: DateTiming,
  now: Instant,
): ReplayUnavailabilityReason | null {
  if (!hasReplayPolicy(timing)) return ReplayUnavailabilityReason.NO_POLICY;
  if (!isReplayWindowOpen(timing, now)) return ReplayUnavailabilityReason.WINDOW_EXPIRED;
  return null;
}
