/**
 * The replay as the VIEWER sees it: how much time is left, and whether they can
 * watch. The context map puts the policy and the window in `catalog` (a promise
 * made before the purchase, which is what justifies the price difference), the
 * sale in `ticketing`, and the file with its expiry in `streaming`.
 */
import { type DateTiming } from '../catalog/date-state.js';
import type { Instant } from '../kernel/clock.js';
import { DateOutcome, ReplayPolicy, ReplayState } from '../vocabulary/catalog.js';
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
/** When the replay's online window closes: from the live's real end, never the scheduled one (D-113, `adr-replay.md` §4). */
export declare function replayClosesAt(liveEndedAt: Instant, windowHours: number): Instant;
/** Does this outcome take the replay away, so its recording is deleted (D-092)? */
export declare function outcomeWithdrawsReplay(outcome: DateOutcome | null): boolean;
/** Does the live's end create a `Replay` (`adr-replay.md` §5): a replay promised, a window, no withdrawing outcome? */
export declare function createsReplayOnLiveEnd(policy: ReplayPolicy, windowHours: number, outcome: DateOutcome | null): boolean;
/**
 * Does the live's end grant the seat holders their accesses (`adr-replay.md` §8): `included`, not
 * withdrawn. One policy stands for D-091's set of modes until they land.
 */
export declare function grantsReplayOnLiveEnd(policy: ReplayPolicy, outcome: DateOutcome | null): boolean;
/** What putting a replay online checks of the date's `Replay`. */
export interface ReplayOnlineCheck {
    readonly state: ReplayState;
    readonly assetReady: boolean;
}
/**
 * Refuses putting a replay online (`ended -> replay_online`) unless the date's `Replay` is
 * `pending` and its file has arrived. `null` is a date with no `Replay`.
 */
export declare function assertReplayGoesOnline(replay: ReplayOnlineCheck | null): void;
//# sourceMappingURL=index.d.ts.map