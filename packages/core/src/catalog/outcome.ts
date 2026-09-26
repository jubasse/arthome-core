/**
 * When a date's outcome can be declared. A declared outcome is a fact, never rewritten nor erased
 * (data-model.md §2.2), and each of the three belongs to one moment of the date.
 */

import { endsAt, type DateTiming } from './date-state.js';
import type { Instant } from '../kernel/clock.js';
import { DomainError } from '../kernel/errors.js';
import { isBefore } from '../time/instant.js';
import { DateOutcome, PublicationState } from '../vocabulary/catalog.js';
import { DomainErrorCode } from '../vocabulary/error-codes.js';

/** `rescheduledTo` is where a postponement moves the date (D-074); the other two carry none. */
export type OutcomeDeclaration =
  | { readonly outcome: typeof DateOutcome.POSTPONED; readonly rescheduledTo: Instant }
  | {
      readonly outcome: typeof DateOutcome.CANCELLED | typeof DateOutcome.INTERRUPTED;
      readonly rescheduledTo: null;
    };

export interface DateBeforeOutcome {
  readonly outcome: DateOutcome | null;
  readonly publicationState: PublicationState;
  readonly timing: DateTiming;
}

function refused(params: Readonly<Record<string, string>>): DomainError {
  return new DomainError({ code: DomainErrorCode.STATE_CONFLICT, params });
}

/**
 * Throws `state.conflict` when the declaration does not fit the date: an outcome already
 * declared; a date not public yet, which is deleted rather than cancelled; a postponement once
 * the live show has started or to an instant already past; an interruption before it started;
 * a cancellation once it has ended.
 */
export function assertOutcomeDeclarable(
  date: DateBeforeOutcome,
  declaration: OutcomeDeclaration,
  now: Instant,
): void {
  if (date.outcome !== null) throw refused({ outcome: date.outcome });
  if (
    date.publicationState === PublicationState.DRAFT ||
    date.publicationState === PublicationState.RESERVE
  ) {
    throw refused({ state: date.publicationState });
  }

  const started = !isBefore(now, date.timing.startsAt);
  switch (declaration.outcome) {
    case DateOutcome.POSTPONED:
      if (started || !isBefore(now, declaration.rescheduledTo)) {
        throw refused({ startsAt: date.timing.startsAt });
      }
      return;
    case DateOutcome.INTERRUPTED:
      if (!started) throw refused({ startsAt: date.timing.startsAt });
      return;
    case DateOutcome.CANCELLED:
      if (!isBefore(now, endsAt(date.timing))) throw refused({ startsAt: date.timing.startsAt });
      return;
  }
}
