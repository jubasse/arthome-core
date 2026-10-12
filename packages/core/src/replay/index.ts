/**
 * The replay as the VIEWER sees it: how much time is left, and whether they can
 * watch. The context map puts the policy and the window in `catalog` (a promise
 * made before the purchase, which is what justifies the price difference), the
 * sale in `ticketing`, and the file with its expiry in `streaming`.
 */

import { replayEndsAt, type DateTiming } from '../catalog/date-state.js';
import type { Instant } from '../kernel/clock.js';
import { DomainError } from '../kernel/errors.js';
import { isBefore, minutesBetween, plusHours } from '../time/instant.js';
import { DateOutcome, ReplayPolicy, ReplayState } from '../vocabulary/catalog.js';
import { WatchDenialReason } from '../vocabulary/entitlement.js';
import { CatalogErrorCode } from '../vocabulary/error-codes.js';

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

/** When the replay's online window closes: from the live's real end, never the scheduled one (D-113, `adr-replay.md` §4). */
export function replayClosesAt(liveEndedAt: Instant, windowHours: number): Instant {
  return plusHours(liveEndedAt, windowHours);
}

const WITHDRAWS_REPLAY: Readonly<Record<DateOutcome, boolean>> = {
  [DateOutcome.POSTPONED]: false,
  [DateOutcome.CANCELLED]: true,
  [DateOutcome.INTERRUPTED]: true,
};

/** Does this outcome take the replay away, so its recording is deleted (D-092)? */
export function outcomeWithdrawsReplay(outcome: DateOutcome | null): boolean {
  return outcome !== null && WITHDRAWS_REPLAY[outcome];
}

/** Does the live's end create a `Replay` (`adr-replay.md` §5): a replay promised, a window, no withdrawing outcome? */
export function createsReplayOnLiveEnd(
  policy: ReplayPolicy,
  windowHours: number,
  outcome: DateOutcome | null,
): boolean {
  return policy !== ReplayPolicy.NONE && windowHours > 0 && !outcomeWithdrawsReplay(outcome);
}

/**
 * Does the live's end grant the seat holders their accesses (`adr-replay.md` §8): `included`, and
 * only where `createsReplayOnLiveEnd` holds, since a `ReplayAccess` exists only for a `Replay` (§5).
 * One policy stands for D-091's set of modes until they land.
 */
export function grantsReplayOnLiveEnd(
  policy: ReplayPolicy,
  windowHours: number,
  outcome: DateOutcome | null,
): boolean {
  return policy === ReplayPolicy.INCLUDED && createsReplayOnLiveEnd(policy, windowHours, outcome);
}

/** What putting a replay online checks of the date's `Replay`. */
export interface ReplayOnlineCheck {
  readonly state: ReplayState;
  readonly assetReady: boolean;
  /** `closesAt` and the command's instant: a closing the sweeper has not applied yet still counts. */
  readonly closing?: { readonly closesAt: Instant; readonly now: Instant };
}

/**
 * Refuses putting a replay online (`ended -> replay_online`) unless the date's `Replay` is
 * `pending`, not past its `closesAt`, and its file has arrived. `null` is a date with no `Replay`.
 * A `pending` `Replay` past its `closesAt` is refused as `closed`.
 */
export function assertReplayGoesOnline(replay: ReplayOnlineCheck | null): void {
  if (replay?.state !== ReplayState.PENDING) {
    throw new DomainError({
      code: CatalogErrorCode.REPLAY_UNAVAILABLE,
      params: { replayState: replay?.state ?? null },
    });
  }
  if (replay.closing && !isBefore(replay.closing.now, replay.closing.closesAt)) {
    throw new DomainError({
      code: CatalogErrorCode.REPLAY_UNAVAILABLE,
      params: { replayState: ReplayState.CLOSED },
    });
  }
  if (!replay.assetReady) {
    throw new DomainError({ code: CatalogErrorCode.REPLAY_ASSET_NOT_READY });
  }
}
