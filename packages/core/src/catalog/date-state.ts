/**
 * `displayStateOf` — THE value the cards show, and the only one.
 *
 * E4: three state axes coexisted on a date with no written hierarchy — `publication.state`,
 * `run.state`, `outcome` — and none carried the displayed state, so each surface recomposed it.
 * The hierarchy, once: outcome OUTRANKS run.state OUTRANKS publication.state OUTRANKS time.
 */

import type { Instant } from '../kernel/clock.js';
import { isAfter, isBefore, minutesBetween, plusHours, plusMinutes } from '../time/instant.js';
import {
  DateOutcome,
  DisplayState,
  PublicationState,
  ReplayPolicy,
  RunState,
} from '../vocabulary/catalog.js';

/** The BOUNDS of a date — what the contract serves alongside the state. */
export interface DateTiming {
  readonly startsAt: Instant;
  readonly runtimeMin: number;
  /** A SERVED domain constant, never a literal copied into five surfaces (E11). */
  readonly roomOpensBeforeMin: number;
  readonly replayPolicy: ReplayPolicy;
  readonly replayWindowHours: number;
}

export interface DisplayStateInput {
  readonly publicationState: PublicationState;
  readonly runState: RunState | null;
  readonly outcome: DateOutcome | null;
  readonly timing: DateTiming;
  readonly now: Instant;
}

export interface DisplayStateResult {
  readonly state: DisplayState;
  /**
   * The instant at which this state STOPS being true — `null` when only an event can change it.
   * Without it, an application waking up shows false states and does not know they are false.
   */
  readonly validUntil: Instant | null;
}

export function roomOpensAt(timing: DateTiming): Instant {
  return plusMinutes(timing.startsAt, -timing.roomOpensBeforeMin);
}

export function endsAt(timing: DateTiming): Instant {
  return plusMinutes(timing.startsAt, timing.runtimeMin);
}

/**
 * The end of the replay window, or `null` when there is none. It runs from the END of the live
 * show, never from the start.
 */
export function replayEndsAt(timing: DateTiming): Instant | null {
  if (timing.replayPolicy === ReplayPolicy.NONE || timing.replayWindowHours <= 0) return null;
  return plusHours(endsAt(timing), timing.replayWindowHours);
}

/** Is the room open? Bounds: `[startsAt - 30 min, startsAt)`. */
export function isRoomOpen(timing: DateTiming, now: Instant): boolean {
  return !isBefore(now, roomOpensAt(timing)) && isBefore(now, timing.startsAt);
}

/** A live show's progress, clamped to `[0, 1]`. */
export function progressOf(timing: DateTiming, now: Instant): number {
  if (timing.runtimeMin <= 0) return 0;
  const elapsed = minutesBetween(timing.startsAt, now);
  return Math.min(1, Math.max(0, elapsed / timing.runtimeMin));
}

function outcomeDisplay(outcome: DateOutcome): DisplayState {
  switch (outcome) {
    case DateOutcome.POSTPONED:
      return DisplayState.POSTPONED;
    case DateOutcome.CANCELLED:
      return DisplayState.CANCELLED;
    case DateOutcome.INTERRUPTED:
      return DisplayState.INTERRUPTED;
  }
}

/** The publication states that are not yet public: the displayed state IS the publication state. */
function preSaleDisplay(state: PublicationState): DisplayState | null {
  switch (state) {
    case PublicationState.DRAFT:
      return DisplayState.DRAFT;
    case PublicationState.RESERVE:
      return DisplayState.RESERVE;
    case PublicationState.TECHNICAL:
      return DisplayState.TECHNICAL;
    default:
      return null;
  }
}

export function displayStateOf(input: DisplayStateInput): DisplayStateResult {
  const { publicationState, runState, outcome, timing, now } = input;

  if (outcome !== null) {
    return { state: outcomeDisplay(outcome), validUntil: null };
  }

  // `interrupted` stays LIVE: the standby screen is a VEIL over an intact video, never a switch
  // (`streaming.md`), so the show can resume until an outcome is declared.
  if (runState === RunState.ON_AIR || runState === RunState.INTERRUPTED) {
    return { state: DisplayState.LIVE, validUntil: endsAt(timing) };
  }

  const preSale = preSaleDisplay(publicationState);
  if (preSale !== null) {
    return { state: preSale, validUntil: null };
  }

  const opensAt = roomOpensAt(timing);
  if (isBefore(now, opensAt)) {
    return { state: DisplayState.SCHEDULED, validUntil: opensAt };
  }
  if (isBefore(now, timing.startsAt)) {
    return { state: DisplayState.ROOM_OPEN, validUntil: timing.startsAt };
  }

  const finishesAt = endsAt(timing);
  if (isBefore(now, finishesAt)) {
    return { state: DisplayState.LIVE, validUntil: finishesAt };
  }

  const replayUntil = replayEndsAt(timing);
  if (replayUntil !== null && isBefore(now, replayUntil)) {
    return { state: DisplayState.REPLAY, validUntil: replayUntil };
  }

  return { state: DisplayState.ENDED, validUntil: null };
}

/** Is the date behind us, replay included? */
export function isFullyOver(timing: DateTiming, now: Instant): boolean {
  const replayUntil = replayEndsAt(timing);
  return isAfter(now, replayUntil ?? endsAt(timing));
}
