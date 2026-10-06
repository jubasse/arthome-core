import { describe, expect, it } from 'vitest';

import {
  HOLD_SCREEN_AUTO_AFTER_SECONDS_DEFAULT,
  PUBLISHER_GRACE_SECONDS,
  RUN_AUTO_END_MINUTES,
  RUN_TRANSITIONS,
  TECHNICAL_CHECK_BITRATE_FLOOR_KBPS_DEFAULT,
  assertRunTransition,
  holdScreenLiftsOnFeedReturn,
  runAutoEndsAt,
  technicalCheckFailuresOf,
} from './index.js';
import { DomainError } from '../kernel/errors.js';
import { plusMinutes } from '../time/instant.js';
import { INCIDENT_CAUSES, IncidentCause, RUN_STATES, RunState } from '../vocabulary/catalog.js';
import { CatalogErrorCode, DomainErrorCode } from '../vocabulary/error-codes.js';
import { IncidentTrigger, TechnicalCheckFailure } from '../vocabulary/streaming.js';

function refusalOf(attempt: () => void): DomainError | null {
  try {
    attempt();
    return null;
  } catch (error) {
    if (error instanceof DomainError) return error;
    throw error;
  }
}

describe("the run's moves", () => {
  it('the transition table, both directions', () => {
    const allowed: readonly (readonly [RunState, RunState])[] = [
      [RunState.IDLE, RunState.REHEARSAL],
      [RunState.IDLE, RunState.ON_AIR],
      [RunState.REHEARSAL, RunState.IDLE],
      [RunState.REHEARSAL, RunState.ON_AIR],
      [RunState.ON_AIR, RunState.INTERRUPTED],
      [RunState.ON_AIR, RunState.ENDED],
      [RunState.INTERRUPTED, RunState.ON_AIR],
      [RunState.INTERRUPTED, RunState.ENDED],
    ];
    for (const from of RUN_STATES) {
      for (const to of RUN_STATES) {
        const onTable = allowed.some(([f, t]) => f === from && t === to);
        expect(RUN_TRANSITIONS[from].includes(to)).toBe(onTable);
        const refusal = refusalOf(() => assertRunTransition(from, to, true));
        if (onTable) {
          expect(refusal).toBeNull();
        } else {
          expect(refusal?.code).toBe(DomainErrorCode.RUN_TRANSITION_FORBIDDEN);
          expect(refusal?.params).toEqual({ from, to });
        }
      }
    }
  });

  it('on air is refused without a passed check', () => {
    for (const from of [RunState.IDLE, RunState.REHEARSAL]) {
      expect(refusalOf(() => assertRunTransition(from, RunState.ON_AIR, false))?.code).toBe(
        CatalogErrorCode.TECHNICAL_CHECK_REQUIRED,
      );
    }
    // Resuming after an incident is not going on air again.
    expect(refusalOf(() => assertRunTransition(RunState.INTERRUPTED, RunState.ON_AIR, false))).toBe(
      null,
    );
  });

  it('ended is final (D-115)', () => {
    expect(RUN_TRANSITIONS[RunState.ENDED]).toEqual([]);
    for (const to of RUN_STATES) {
      expect(refusalOf(() => assertRunTransition(RunState.ENDED, to, true))?.code).toBe(
        DomainErrorCode.RUN_TRANSITION_FORBIDDEN,
      );
    }
  });
});

describe('the technical check (D-114)', () => {
  const floor = TECHNICAL_CHECK_BITRATE_FLOOR_KBPS_DEFAULT;

  it("the check's failures, no_feed alone without a feed, the floor defaulting to TECHNICAL_CHECK_BITRATE_FLOOR_KBPS_DEFAULT", () => {
    expect(
      technicalCheckFailuresOf({ feedReceived: true, codecCarried: true, bitrateKbps: floor }),
    ).toEqual([]);
    expect(
      technicalCheckFailuresOf({ feedReceived: false, codecCarried: false, bitrateKbps: 0 }),
    ).toEqual([TechnicalCheckFailure.NO_FEED]);
    expect(
      technicalCheckFailuresOf({ feedReceived: true, codecCarried: false, bitrateKbps: floor - 1 }),
    ).toEqual([TechnicalCheckFailure.CODEC_NOT_CARRIED, TechnicalCheckFailure.BITRATE_BELOW_FLOOR]);
    expect(
      technicalCheckFailuresOf(
        { feedReceived: true, codecCarried: true, bitrateKbps: floor },
        floor + 1,
      ),
    ).toEqual([TechnicalCheckFailure.BITRATE_BELOW_FLOOR]);
  });
});

describe("the run's automatic end (D-115, D-123)", () => {
  const scheduledEnd = '2026-09-21T21:00:00.000Z';

  it('a run ends by itself once no publisher has been connected for RUN_AUTO_END_MINUTES after the scheduled end (D-123)', () => {
    expect(RUN_AUTO_END_MINUTES).toBe(15);
    expect(runAutoEndsAt(scheduledEnd, '2026-09-21T21:20:00.000Z', true)).toBeNull();
    expect(runAutoEndsAt(scheduledEnd, '2026-09-21T20:50:00.000Z', false)).toBe(
      plusMinutes(scheduledEnd, RUN_AUTO_END_MINUTES),
    );
    // An overrun: the publisher left after the scheduled end, and the minutes count from there.
    expect(runAutoEndsAt(scheduledEnd, '2026-09-21T21:20:00.000Z', false)).toBe(
      plusMinutes('2026-09-21T21:20:00.000Z', RUN_AUTO_END_MINUTES),
    );
    expect(runAutoEndsAt(scheduledEnd, null, false)).toBe(
      plusMinutes(scheduledEnd, RUN_AUTO_END_MINUTES),
    );
  });
});

describe('the hold screen (D-124)', () => {
  it("an automatic hold screen lifts on the feed's return, a manual one stays (D-124)", () => {
    for (const cause of INCIDENT_CAUSES) {
      expect(holdScreenLiftsOnFeedReturn({ cause, trigger: IncidentTrigger.AUTO })).toBe(
        cause === IncidentCause.VENUE_FEED_LOST,
      );
      expect(holdScreenLiftsOnFeedReturn({ cause, trigger: IncidentTrigger.MANUAL })).toBe(false);
    }
  });

  it('a glitch the publisher grace absorbs never raises the automatic veil', () => {
    expect(PUBLISHER_GRACE_SECONDS).toBeLessThanOrEqual(HOLD_SCREEN_AUTO_AFTER_SECONDS_DEFAULT);
  });
});
