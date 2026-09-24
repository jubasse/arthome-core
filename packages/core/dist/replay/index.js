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
import { replayEndsAt } from '../catalog/date-state.js';
import { minutesBetween } from '../time/instant.js';
import { ReplayPolicy } from '../vocabulary/catalog.js';
import { WatchDenialReason } from '../vocabulary/entitlement.js';
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
export function replayHoursLeft(timing, now) {
    const endsAtInstant = replayEndsAt(timing);
    if (endsAtInstant === null)
        return 0;
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
export function isReplayWindowOpen(timing, now) {
    return replayHoursLeft(timing, now) > 0;
}
/** Does the date promise a replay at all, whatever the window? */
export function hasReplayPolicy(timing) {
    return timing.replayPolicy !== ReplayPolicy.NONE;
}
/**
 * Is the replay paid for separately?
 *
 * `unit` is the only policy that asks `ticketing` for a price. `included` and
 * `subscription` open on an entitlement already held.
 */
export function isReplaySoldSeparately(timing) {
    return timing.replayPolicy === ReplayPolicy.UNIT;
}
// Why a replay is not watchable is ALREADY a vocabulary, and it is
// `WATCH_DENIAL_REASONS`. This module used to declare its own two members —
// `no_replay_policy` and `replay_window_expired` — which are the same two facts
// as `NO_REPLAY` and `REPLAY_EXPIRED`, in a second spelling and a second case.
//
// Two vocabularies for one pair of facts is E2 inside the package written to
// prevent it, and only one of the two reached the wire, so a surface could not
// have matched on both even if it wanted to. Retired in favour of the denial
// reasons; the granularity was never different, only the name.
/**
 * The full diagnosis, in one pass.
 *
 * Returns `null` when the replay is available — the absence of a reason IS
 * availability, which avoids a second call to find out why.
 */
export function replayUnavailabilityReason(timing, now) {
    if (!hasReplayPolicy(timing))
        return WatchDenialReason.NO_REPLAY;
    if (!isReplayWindowOpen(timing, now))
        return WatchDenialReason.REPLAY_EXPIRED;
    return null;
}
//# sourceMappingURL=index.js.map