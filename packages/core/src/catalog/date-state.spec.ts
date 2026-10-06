import { describe, expect, it } from 'vitest';

import {
  displayStateOf,
  isRoomOpen,
  progressOf,
  publicDisplayStateOf,
  type DateTiming,
} from './date-state.js';
import { plusMinutes } from '../time/instant.js';
import {
  DateOutcome,
  DisplayState,
  PublicationState,
  RunState,
  ReplayPolicy,
} from '../vocabulary/catalog.js';

const timing: DateTiming = {
  startsAt: '2026-09-21T19:00:00.000Z',
  runtimeMin: 120,
  roomOpensBeforeMin: 30,
  replayPolicy: ReplayPolicy.INCLUDED,
  replayWindowHours: 48,
};

/**
 * PROTECTED INVARIANT
 *   `outcome` outranks `run.state`, which outranks `publication.state`.
 *   One derived value, and nobody recomposes it.
 *
 * WHY THIS TEST EXISTS, AND WHY IT TESTS THE WHOLE TABLE
 *   E4: three axes coexisted with no written hierarchy, and each surface chose.
 *   The case that hurts LOOKS ABSURD — a `live` publication, an `on-air` run
 *   and a `cancelled` outcome all at once — and it is precisely the one a KAFKA
 *   CONSUMPTION ORDER produces: the three axes are fed by three topics, and
 *   nothing guarantees they arrive in the order they happened.
 *
 *   Testing the plausible cases is therefore not enough: it is the implausible
 *   combination that turns up in production.
 *
 *   Written BEFORE the rule.
 */
describe('displayStateOf — the precedence of the three axes', () => {
  it('lets the outcome win against a run in progress', () => {
    // The "absurd" case: it happens.
    const result = displayStateOf({
      publicationState: PublicationState.LIVE,
      runState: RunState.ON_AIR,
      outcome: DateOutcome.CANCELLED,
      timing,
      now: '2026-09-21T19:30:00.000Z',
    });

    expect(result.state).toBe(DisplayState.CANCELLED);
  });

  it('lets a final outcome win, whatever the other axes say', () => {
    for (const [outcome, expected] of [
      [DateOutcome.CANCELLED, DisplayState.CANCELLED],
      [DateOutcome.INTERRUPTED, DisplayState.INTERRUPTED],
    ] as const) {
      const result = displayStateOf({
        publicationState: PublicationState.LIVE,
        runState: RunState.ON_AIR,
        outcome,
        timing,
        now: '2026-09-21T19:30:00.000Z',
      });
      expect(result.state).toBe(expected);
    }
  });

  it('shows a postponed date as postponed until its room opens at the new time, then lets it run', () => {
    const postponed = {
      publicationState: PublicationState.SCHEDULED,
      runState: null,
      outcome: DateOutcome.POSTPONED,
      timing,
    } as const;

    expect(displayStateOf({ ...postponed, now: '2026-09-20T12:00:00.000Z' })).toEqual({
      state: DisplayState.POSTPONED,
      validUntil: '2026-09-21T18:30:00.000Z',
    });
    expect(displayStateOf({ ...postponed, now: '2026-09-21T18:45:00.000Z' }).state).toBe(
      DisplayState.ROOM_OPEN,
    );
    expect(
      displayStateOf({ ...postponed, runState: RunState.ON_AIR, now: '2026-09-21T19:30:00.000Z' })
        .state,
    ).toBe(DisplayState.LIVE);
  });

  it('NEVER expires an outcome: it is a fact, not a temporal state', () => {
    const result = displayStateOf({
      publicationState: PublicationState.ENDED,
      runState: null,
      outcome: DateOutcome.CANCELLED,
      timing,
      now: '2027-01-01T00:00:00.000Z',
    });

    expect(result.validUntil).toBeNull();
  });

  it('lets being on air win against time when no outcome exists', () => {
    // The run desk went on air BEFORE the announced hour: it is the run desk
    // that is authoritative, not the schedule.
    const result = displayStateOf({
      publicationState: PublicationState.TECHNICAL,
      runState: RunState.ON_AIR,
      outcome: null,
      timing,
      now: '2026-09-21T18:45:00.000Z',
    });

    expect(result.state).toBe(DisplayState.LIVE);
  });

  it('keeps LIVE during a run interruption — the veil goes on top', () => {
    // `streaming.md`: the standby screen is a CLIENT-SIDE VEIL laid over an
    // intact video, never a feed switch. As long as no outcome is declared, the
    // show can resume: the displayed state stays LIVE and the incident is
    // layered on top.
    const result = displayStateOf({
      publicationState: PublicationState.LIVE,
      runState: RunState.INTERRUPTED,
      outcome: null,
      timing,
      now: '2026-09-21T19:30:00.000Z',
    });

    expect(result.state).toBe(DisplayState.LIVE);
  });
});

/**
 * PROTECTED INVARIANT
 *   A served state carries the instant at which it STOPS being true.
 *
 * WHY
 *   It is the arbitration that reconciles "no value computed twice" with "a
 *   response must still be right eight hours after being cached". Five surfaces
 *   out of six asked the question. Without `validUntil`, an application waking
 *   up shows false states AND DOES NOT KNOW THEY ARE FALSE.
 */
describe('displayStateOf — the validity of what is served', () => {
  it('expires when the room opens if the date is upcoming', () => {
    const result = displayStateOf({
      publicationState: PublicationState.SCHEDULED,
      runState: RunState.IDLE,
      outcome: null,
      timing,
      now: '2026-09-21T12:00:00.000Z',
    });

    expect(result.state).toBe(DisplayState.SCHEDULED);
    expect(result.validUntil).toBe('2026-09-21T18:30:00.000Z');
  });

  it('expires at curtain-up when the room is open on the clock of an unknown run', () => {
    const result = displayStateOf({
      publicationState: PublicationState.SCHEDULED,
      runState: null,
      outcome: null,
      timing,
      now: '2026-09-21T18:45:00.000Z',
    });

    expect(result.state).toBe(DisplayState.ROOM_OPEN);
    expect(result.validUntil).toBe('2026-09-21T19:00:00.000Z');
  });

  it('serves a validity that is EXACT a second before the switch', () => {
    // The case that hurts: a state served ONE SECOND before the room opens must
    // hold until that instant, not until "now + 60 s".
    const result = displayStateOf({
      publicationState: PublicationState.SCHEDULED,
      runState: RunState.IDLE,
      outcome: null,
      timing,
      now: '2026-09-21T18:29:59.000Z',
    });

    expect(result.state).toBe(DisplayState.SCHEDULED);
    expect(result.validUntil).toBe('2026-09-21T18:30:00.000Z');
  });

  it('expires at the end of the replay window', () => {
    const result = displayStateOf({
      publicationState: PublicationState.REPLAY_ONLINE,
      runState: null,
      outcome: null,
      timing,
      now: '2026-09-22T10:00:00.000Z',
    });

    expect(result.state).toBe(DisplayState.REPLAY);
    // End of the live show (21:00) + 48 h.
    expect(result.validUntil).toBe('2026-09-23T21:00:00.000Z');
  });

  it('carries no validity on a state only a command changes', () => {
    const result = displayStateOf({
      publicationState: PublicationState.DRAFT,
      runState: null,
      outcome: null,
      timing,
      now: '2026-09-01T10:00:00.000Z',
    });

    expect(result.state).toBe(DisplayState.DRAFT);
    expect(result.validUntil).toBeNull();
  });

  it('falls to ENDED when the replay has expired', () => {
    const result = displayStateOf({
      publicationState: PublicationState.REPLAY_ONLINE,
      runState: null,
      outcome: null,
      timing,
      now: '2026-09-25T00:00:00.000Z',
    });

    expect(result.state).toBe(DisplayState.ENDED);
    expect(result.validUntil).toBeNull();
  });

  it('never announces a replay when the policy forbids one', () => {
    const result = displayStateOf({
      publicationState: PublicationState.ENDED,
      runState: null,
      outcome: null,
      timing: { ...timing, replayPolicy: ReplayPolicy.NONE, replayWindowHours: 0 },
      now: '2026-09-21T22:00:00.000Z',
    });

    expect(result.state).toBe(DisplayState.ENDED);
  });
});

describe('publicDisplayStateOf — a published date under technical check', () => {
  const checking = {
    publicationState: PublicationState.TECHNICAL,
    runState: null,
    outcome: null,
    timing,
  } as const;

  it('shows the public the time axis, and the studio the check', () => {
    const now = '2026-09-21T17:00:00.000Z';

    expect(publicDisplayStateOf({ ...checking, now })).toEqual({
      state: DisplayState.SCHEDULED,
      validUntil: '2026-09-21T18:30:00.000Z',
    });
    expect(displayStateOf({ ...checking, now }).state).toBe(DisplayState.TECHNICAL);
  });

  it('opens the room on time while the check runs', () => {
    const result = publicDisplayStateOf({ ...checking, now: '2026-09-21T18:45:00.000Z' });

    expect(result).toEqual({ state: DisplayState.ROOM_OPEN, validUntil: timing.startsAt });
  });

  it('keeps the hierarchy: the outcome and the run still outrank it', () => {
    const now = '2026-09-21T18:45:00.000Z';

    expect(publicDisplayStateOf({ ...checking, outcome: DateOutcome.CANCELLED, now }).state).toBe(
      DisplayState.CANCELLED,
    );
    expect(publicDisplayStateOf({ ...checking, runState: RunState.ON_AIR, now }).state).toBe(
      DisplayState.LIVE,
    );
  });
});

describe('the time derivations the surface re-evaluates itself', () => {
  it('opens the room exactly 30 minutes before, bound included', () => {
    expect(isRoomOpen(timing, '2026-09-21T18:29:59.000Z')).toBe(false);
    expect(isRoomOpen(timing, '2026-09-21T18:30:00.000Z')).toBe(true);
    expect(isRoomOpen(timing, '2026-09-21T18:59:59.000Z')).toBe(true);
    // At curtain-up the room is no longer "open": the live show begins.
    expect(isRoomOpen(timing, '2026-09-21T19:00:00.000Z')).toBe(false);
  });

  it('clamps progress between 0 and 1', () => {
    expect(progressOf(timing, '2026-09-21T18:00:00.000Z')).toBe(0);
    expect(progressOf(timing, '2026-09-21T20:00:00.000Z')).toBe(0.5);
    expect(progressOf(timing, '2026-09-22T00:00:00.000Z')).toBe(1);
  });
});

/**
 * PROTECTED INVARIANT
 *   A known run moves the card, the clock does not (D-109, D-115): `live` on the real on-air
 *   switch, held through an overrun, and `ended` once the run ends. Only an unknown run, as the
 *   catalog card passes until it consumes the run, keeps the clock.
 */
describe('displayStateOf — the run moves the card', () => {
  const at = (runState: RunState | null, now: string) =>
    displayStateOf({
      publicationState: PublicationState.LIVE,
      runState,
      outcome: null,
      timing,
      now,
    });

  it('a known idle run past the start keeps the room open until the run moves (D-109)', () => {
    for (const runState of [RunState.IDLE, RunState.REHEARSAL]) {
      for (const now of [
        '2026-09-21T18:45:00.000Z',
        '2026-09-21T19:20:00.000Z',
        '2026-09-21T21:30:00.000Z',
        '2026-09-25T00:00:00.000Z',
      ]) {
        expect(at(runState, now)).toEqual({ state: DisplayState.ROOM_OPEN, validUntil: null });
      }
    }
  });

  it('a show starting 70 minutes late, past its scheduled end, is in its room, then live (D-109)', () => {
    const hourLong: DateTiming = { ...timing, runtimeMin: 60 };
    const lateBy = (minutes: number) => plusMinutes(hourLong.startsAt, minutes);
    const of = (runState: RunState, now: string) =>
      displayStateOf({
        publicationState: PublicationState.LIVE,
        runState,
        outcome: null,
        timing: hourLong,
        now,
      });

    // Past the scheduled end (+60), the run still idle: the room, never the replay.
    expect(of(RunState.IDLE, lateBy(65))).toEqual({
      state: DisplayState.ROOM_OPEN,
      validUntil: null,
    });
    expect(of(RunState.ON_AIR, lateBy(70))).toEqual({ state: DisplayState.LIVE, validUntil: null });
    expect(of(RunState.ENDED, lateBy(140)).state).toBe(DisplayState.ENDED);
    // An outcome still outranks the waiting room.
    expect(
      displayStateOf({
        publicationState: PublicationState.LIVE,
        runState: RunState.IDLE,
        outcome: DateOutcome.CANCELLED,
        timing: hourLong,
        now: lateBy(65),
      }).state,
    ).toBe(DisplayState.CANCELLED);
  });

  it('a run on air serves no expiry, an overrun included', () => {
    for (const runState of [RunState.ON_AIR, RunState.INTERRUPTED]) {
      expect(at(runState, '2026-09-21T19:20:00.000Z')).toEqual({
        state: DisplayState.LIVE,
        validUntil: null,
      });
      expect(at(runState, '2026-09-21T21:40:00.000Z')).toEqual({
        state: DisplayState.LIVE,
        validUntil: null,
      });
    }
  });

  it('an ended run shows ended', () => {
    expect(at(RunState.ENDED, '2026-09-21T20:50:00.000Z')).toEqual({
      state: DisplayState.ENDED,
      validUntil: null,
    });
  });

  it('an unknown run keeps the clock', () => {
    expect(at(null, '2026-09-21T18:45:00.000Z')).toEqual({
      state: DisplayState.ROOM_OPEN,
      validUntil: '2026-09-21T19:00:00.000Z',
    });
    expect(at(null, '2026-09-21T19:20:00.000Z')).toEqual({
      state: DisplayState.LIVE,
      validUntil: '2026-09-21T21:00:00.000Z',
    });
  });

  it('publicDisplayStateOf inherits it on a date under technical check', () => {
    expect(
      publicDisplayStateOf({
        publicationState: PublicationState.TECHNICAL,
        runState: RunState.IDLE,
        outcome: null,
        timing,
        now: '2026-09-21T19:20:00.000Z',
      }).state,
    ).toBe(DisplayState.ROOM_OPEN);
  });
});
