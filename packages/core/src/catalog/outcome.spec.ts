import { describe, expect, it } from 'vitest';

import { endsAt, type DateTiming } from './date-state.js';
import { assertOutcomeDeclarable, type DateBeforeOutcome } from './outcome.js';
import { isDomainError } from '../kernel/errors.js';
import { DateOutcome, PublicationState, ReplayPolicy } from '../vocabulary/catalog.js';
import { CatalogErrorCode } from '../vocabulary/error-codes.js';

const timing: DateTiming = {
  startsAt: '2026-11-04T19:30:00.000Z',
  runtimeMin: 95,
  roomOpensBeforeMin: 30,
  replayPolicy: ReplayPolicy.NONE,
  replayWindowHours: 0,
};

const scheduled: DateBeforeOutcome = {
  outcome: null,
  postponements: 0,
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

  it('refuses each outside its moment, naming the instant it met', () => {
    const inThePast = { ...postpone, rescheduledTo: '2026-10-01T19:30:00.000Z' };
    expect(refusalOf(() => assertOutcomeDeclarable(scheduled, postpone, DURING))).toEqual({
      code: CatalogErrorCode.DATE_ALREADY_STARTED,
      params: { startsAt: timing.startsAt },
    });
    expect(refusalOf(() => assertOutcomeDeclarable(scheduled, inThePast, BEFORE))).toEqual({
      code: CatalogErrorCode.RESCHEDULE_IN_PAST,
      params: { rescheduledTo: inThePast.rescheduledTo },
    });
    expect(refusalOf(() => assertOutcomeDeclarable(scheduled, interrupt, BEFORE))).toEqual({
      code: CatalogErrorCode.DATE_NOT_STARTED,
      params: { startsAt: timing.startsAt },
    });
    expect(refusalOf(() => assertOutcomeDeclarable(scheduled, cancel, AFTER))).toEqual({
      code: CatalogErrorCode.DATE_ALREADY_ENDED,
      params: { endsAt: endsAt(timing) },
    });
  });

  it('lets a postponed date move again or be cancelled, up to three postponements', () => {
    const postponed = { ...scheduled, outcome: DateOutcome.POSTPONED, postponements: 2 };

    expect(refusalOf(() => assertOutcomeDeclarable(postponed, postpone, BEFORE))).toBeNull();
    expect(refusalOf(() => assertOutcomeDeclarable(postponed, cancel, BEFORE))).toBeNull();
    expect(
      refusalOf(() =>
        assertOutcomeDeclarable({ ...postponed, postponements: 3 }, postpone, BEFORE),
      ),
    ).toEqual({ code: CatalogErrorCode.POSTPONEMENT_LIMIT_REACHED, params: { max: 3 } });
  });

  it('never rewrites a final outcome, and never declares one on a date not public', () => {
    expect(
      refusalOf(() =>
        assertOutcomeDeclarable({ ...scheduled, outcome: DateOutcome.CANCELLED }, postpone, BEFORE),
      ),
    ).toEqual({ code: CatalogErrorCode.OUTCOME_FINAL, params: { outcome: DateOutcome.CANCELLED } });
    expect(
      refusalOf(() =>
        assertOutcomeDeclarable(
          { ...scheduled, publicationState: PublicationState.DRAFT },
          cancel,
          BEFORE,
        ),
      ),
    ).toEqual({
      code: CatalogErrorCode.DATE_NOT_PUBLIC,
      params: { state: PublicationState.DRAFT },
    });
  });
});
