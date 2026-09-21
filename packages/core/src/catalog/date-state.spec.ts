import { describe, expect, it } from 'vitest';

import { DateOutcome, DisplayState, PublicationState, RunState } from '../vocabulary/catalog.js';
import { ReplayPolicy } from '../vocabulary/catalog.js';
import { displayStateOf, isRoomOpen, progressOf, type DateTiming } from './date-state.js';

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

  it('lets the outcome win on all three values, with no exception', () => {
    for (const [outcome, expected] of [
      [DateOutcome.CANCELLED, DisplayState.CANCELLED],
      [DateOutcome.POSTPONED, DisplayState.POSTPONED],
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

  it('expires at curtain-up when the room is open', () => {
    const result = displayStateOf({
      publicationState: PublicationState.SCHEDULED,
      runState: RunState.IDLE,
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
