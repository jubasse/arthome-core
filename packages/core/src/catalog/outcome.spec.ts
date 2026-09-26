import { describe, expect, it } from 'vitest';

import type { DateTiming } from './date-state.js';
import { assertOutcomeDeclarable, type DateBeforeOutcome } from './outcome.js';
import { isDomainError } from '../kernel/errors.js';
import { DateOutcome, PublicationState, ReplayPolicy } from '../vocabulary/catalog.js';
import { DomainErrorCode } from '../vocabulary/error-codes.js';

const timing: DateTiming = {
  startsAt: '2026-11-04T19:30:00.000Z',
  runtimeMin: 95,
  roomOpensBeforeMin: 30,
  replayPolicy: ReplayPolicy.NONE,
  replayWindowHours: 0,
};

const scheduled: DateBeforeOutcome = {
  outcome: null,
  publicationState: PublicationState.SCHEDULED,
  timing,
};

const BEFORE = '2026-11-01T12:00:00.000Z';
const DURING = '2026-11-04T20:00:00.000Z';
const AFTER = '2026-11-05T00:00:00.000Z';

const postpone = {
  outcome: DateOutcome.POSTPONED,
  rescheduledTo: '2026-11-12T19:30:00.000Z',
} as const;
const cancel = { outcome: DateOutcome.CANCELLED, rescheduledTo: null } as const;
const interrupt = { outcome: DateOutcome.INTERRUPTED, rescheduledTo: null } as const;

function refusalOf(declare: () => void): unknown {
  try {
    declare();
  } catch (error) {
    if (isDomainError(error)) return { code: error.code, params: error.params };
    throw error;
  }
  return null;
}

describe('assertOutcomeDeclarable — each outcome at its moment', () => {
  it('accepts a postponement before the show, a cancellation until it ends, an interruption once it started', () => {
    expect(refusalOf(() => assertOutcomeDeclarable(scheduled, postpone, BEFORE))).toBeNull();
    expect(refusalOf(() => assertOutcomeDeclarable(scheduled, cancel, DURING))).toBeNull();
    expect(refusalOf(() => assertOutcomeDeclarable(scheduled, interrupt, DURING))).toBeNull();
  });

  it('refuses each outside its moment, naming the start', () => {
    for (const [declaration, now] of [
      [postpone, DURING],
      [{ ...postpone, rescheduledTo: '2026-10-01T19:30:00.000Z' }, BEFORE],
      [interrupt, BEFORE],
      [cancel, AFTER],
    ] as const) {
      expect(refusalOf(() => assertOutcomeDeclarable(scheduled, declaration, now))).toEqual({
        code: DomainErrorCode.STATE_CONFLICT,
        params: { startsAt: timing.startsAt },
      });
    }
  });

  it('never rewrites a declared outcome, and never declares one on a date not public', () => {
    expect(
      refusalOf(() =>
        assertOutcomeDeclarable({ ...scheduled, outcome: DateOutcome.POSTPONED }, cancel, BEFORE),
      ),
    ).toEqual({ code: DomainErrorCode.STATE_CONFLICT, params: { outcome: DateOutcome.POSTPONED } });
    expect(
      refusalOf(() =>
        assertOutcomeDeclarable(
          { ...scheduled, publicationState: PublicationState.DRAFT },
          cancel,
          BEFORE,
        ),
      ),
    ).toEqual({ code: DomainErrorCode.STATE_CONFLICT, params: { state: PublicationState.DRAFT } });
  });
});
