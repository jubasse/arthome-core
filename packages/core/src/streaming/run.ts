import type { Instant } from '../kernel/clock.js';
import { DomainError } from '../kernel/errors.js';
import { latest, plusMinutes } from '../time/instant.js';
import { IncidentCause, RunState } from '../vocabulary/catalog.js';
import { CatalogErrorCode, DomainErrorCode } from '../vocabulary/error-codes.js';
import {
  IncidentTrigger,
  TECHNICAL_CHECK_FAILURES,
  TechnicalCheckFailure,
} from '../vocabulary/streaming.js';

/**
 * The moves a run may make. `ended` is final (D-115). `interrupted` is reached through an
 * incident only, so no studio route asks for it.
 */
export const RUN_TRANSITIONS: Readonly<Record<RunState, readonly RunState[]>> = {
  [RunState.IDLE]: [RunState.REHEARSAL, RunState.ON_AIR],
  [RunState.REHEARSAL]: [RunState.IDLE, RunState.ON_AIR],
  [RunState.ON_AIR]: [RunState.INTERRUPTED, RunState.ENDED],
  [RunState.INTERRUPTED]: [RunState.ON_AIR, RunState.ENDED],
  [RunState.ENDED]: [],
};

const GOES_ON_AIR_ONLY_AFTER_A_CHECK: Readonly<Record<RunState, boolean>> = {
  [RunState.IDLE]: true,
  [RunState.REHEARSAL]: true,
  [RunState.ON_AIR]: false,
  [RunState.INTERRUPTED]: false,
  [RunState.ENDED]: false,
};

export function assertRunTransition(
  from: RunState,
  to: RunState,
  technicalCheckPassed: boolean,
): void {
  if (!RUN_TRANSITIONS[from].includes(to)) {
    throw new DomainError({
      code: DomainErrorCode.RUN_TRANSITION_FORBIDDEN,
      params: { from, to },
    });
  }
  if (to === RunState.ON_AIR && GOES_ON_AIR_ONLY_AFTER_A_CHECK[from] && !technicalCheckPassed) {
    throw new DomainError({ code: CatalogErrorCode.TECHNICAL_CHECK_REQUIRED });
  }
}

/** The floor until a channel serves its `recommendedBitrateKbps`: the lead's technical default, which the product owner may adjust. */
export const TECHNICAL_CHECK_BITRATE_FLOOR_KBPS_DEFAULT = 1500;

/** What the check observed on the date's key (D-114). */
export interface TechnicalCheckProbe {
  readonly feedReceived: boolean;
  readonly codecCarried: boolean;
  readonly bitrateKbps: number;
}

const FAILS: Readonly<
  Record<TechnicalCheckFailure, (probe: TechnicalCheckProbe, floorKbps: number) => boolean>
> = {
  [TechnicalCheckFailure.NO_FEED]: (probe) => !probe.feedReceived,
  [TechnicalCheckFailure.CODEC_NOT_CARRIED]: (probe) => !probe.codecCarried,
  // A bitrate that is not a finite number was not measured, so it proves nothing.
  [TechnicalCheckFailure.BITRATE_BELOW_FLOOR]: (probe, floorKbps) =>
    !Number.isFinite(probe.bitrateKbps) || probe.bitrateKbps < floorKbps,
};

/** The floor a check holds a feed to: the channel's `recommendedBitrateKbps`, or the default until it serves one. */
export function technicalCheckFloorKbps(recommendedBitrateKbps: number | null | undefined): number {
  return recommendedBitrateKbps ?? TECHNICAL_CHECK_BITRATE_FLOOR_KBPS_DEFAULT;
}

/** The check's failures in vocabulary order, empty for a pass. Without a feed nothing else was measured, so `no_feed` comes alone. */
export function technicalCheckFailuresOf(
  probe: TechnicalCheckProbe,
  floorKbps: number,
): readonly TechnicalCheckFailure[] {
  if (!probe.feedReceived) return [TechnicalCheckFailure.NO_FEED];
  return TECHNICAL_CHECK_FAILURES.filter((failure) => FAILS[failure](probe, floorKbps));
}

/** The channel's default delay before a lost feed raises the hold screen by itself (`realtime.md` §4, `data-model.md` §5.6). */
export const HOLD_SCREEN_AUTO_AFTER_SECONDS_DEFAULT = 15;

/**
 * How long a publisher may drop before the run desk is told it is gone: the venue cut
 * `streaming.md` §6 describes, plus the encoder's reconnect. It equals the floor of the channel's
 * hold-screen delay, so a glitch it absorbs never raises the automatic veil.
 */
export const PUBLISHER_GRACE_SECONDS = 5;

/** D-123, completing D-115. */
export const RUN_AUTO_END_MINUTES = 15;

/** When a run left on air ends by itself; `null` while a publisher is connected. */
export function runAutoEndsAt(
  scheduledEndsAt: Instant,
  publisherLastSeenAt: Instant | null,
  publisherConnected: boolean,
): Instant | null {
  if (publisherConnected) return null;
  const quietSince =
    publisherLastSeenAt === null ? scheduledEndsAt : latest(scheduledEndsAt, publisherLastSeenAt);
  return plusMinutes(quietSince, RUN_AUTO_END_MINUTES);
}

/** D-124: only the automatic hold screen of a lost feed lifts itself; one raised by hand waits for `resolveIncident`. */
export function holdScreenLiftsOnFeedReturn(incident: {
  readonly cause: IncidentCause;
  readonly trigger: IncidentTrigger;
}): boolean {
  return (
    incident.trigger === IncidentTrigger.AUTO && incident.cause === IncidentCause.VENUE_FEED_LOST
  );
}
