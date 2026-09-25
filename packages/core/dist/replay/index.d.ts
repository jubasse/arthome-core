/**
 * The replay as the VIEWER sees it: how much time is left, and whether they can
 * watch. The context map puts the policy and the window in `catalog` (a promise
 * made before the purchase, which is what justifies the price difference), the
 * sale in `ticketing`, and the file with its expiry in `streaming`.
 */
import { type DateTiming } from '../catalog/date-state.js';
import type { Instant } from '../kernel/clock.js';
import { WatchDenialReason } from '../vocabulary/entitlement.js';
/**
 * The replay hours remaining — a DECREASING value.
 *
 * DERIVED: the contract delivers the end instant and the window, not a count
 * that would be wrong a minute later — hence the explicit `now`.
 */
export declare function replayHoursLeft(timing: DateTiming, now: Instant): number;
/** Is the replay STILL online? Distinct from whether one exists: two different screens. */
export declare function isReplayWindowOpen(timing: DateTiming, now: Instant): boolean;
/** Does the date promise a replay at all, whatever the window? */
export declare function hasReplayPolicy(timing: DateTiming): boolean;
/** Is the replay paid for separately? `unit` is the only policy with its own price. */
export declare function isReplaySoldSeparately(timing: DateTiming): boolean;
/** The full diagnosis, in one pass. `null` is availability, so nothing needs a second call. */
export declare function replayUnavailabilityReason(timing: DateTiming, now: Instant): WatchDenialReason | null;
//# sourceMappingURL=index.d.ts.map