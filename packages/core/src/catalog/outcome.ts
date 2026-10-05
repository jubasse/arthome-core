/**
 * When a date's outcome can be declared. Each of the three belongs to one moment of the date, and
 * only a postponement can be followed by another outcome (data-model.md §2.2, D-076).
 */

import { endsAt, type DateTiming } from './date-state.js';
import type { Instant } from '../kernel/clock.js';
import { DomainConstant } from '../kernel/domain-constants.js';
import { DomainError } from '../kernel/errors.js';
import { isBefore } from '../time/instant.js';
import { DateOutcome, PublicationState } from '../vocabulary/catalog.js';
import { CatalogErrorCode } from '../vocabulary/error-codes.js';

/** `rescheduledTo` is where a postponement moves the date (D-074); the other two carry none. */
export type OutcomeDeclaration =
  | { readonly outcome: typeof DateOutcome.POSTPONED; readonly rescheduledTo: Instant }
  | {
      readonly outcome: typeof DateOutcome.CANCELLED | typeof DateOutcome.INTERRUPTED;
      readonly rescheduledTo: null;
    };

export interface DateBeforeOutcome {
  readonly outcome: DateOutcome | null;
  /** How many times the date was postponed already. */
  readonly postponements: number;
  readonly publicationState: PublicationState;
  readonly timing: DateTiming;
}

/**
 * Refuses a declaration that does not fit the date, naming what it met: a final outcome already
 * declared, a date not public yet (deleted rather than given an outcome), a postponement once the
 * live show has started or to an instant already past, an interruption before it started, a
 * cancellation once it has ended, and a postponement past `POSTPONEMENTS_MAX`.
 */
export function assertOutcomeDeclarable(
  date: DateBeforeOutcome,
  declaration: OutcomeDeclaration,
  now: Instant,
): void {
  if (date.outcome !== null && date.outcome !== DateOutcome.POSTPONED) {
    throw new DomainError({
      code: CatalogErrorCode.OUTCOME_FINAL,
      params: { outcome: date.outcome },
    });
  }
  if (
    date.publicationState === PublicationState.DRAFT ||
    date.publicationState === PublicationState.RESERVE
  ) {
    throw new DomainError({
      code: CatalogErrorCode.DATE_NOT_PUBLIC,
      params: { state: date.publicationState },
    });
  }

  const { startsAt } = date.timing;
  const started = !isBefore(now, startsAt);
  switch (declaration.outcome) {
    case DateOutcome.POSTPONED:
      if (date.postponements >= DomainConstant.POSTPONEMENTS_MAX) {
        throw new DomainError({
          code: CatalogErrorCode.POSTPONEMENT_LIMIT_REACHED,
          params: { max: DomainConstant.POSTPONEMENTS_MAX },
        });
      }
      if (started) {
        throw new DomainError({
          code: CatalogErrorCode.DATE_ALREADY_STARTED,
          params: { startsAt },
        });
      }
      if (!isBefore(now, declaration.rescheduledTo)) {
        throw new DomainError({
          code: CatalogErrorCode.RESCHEDULE_IN_PAST,
          params: { rescheduledTo: declaration.rescheduledTo },
        });
      }
      return;
    case DateOutcome.INTERRUPTED:
      if (!started) {
        throw new DomainError({ code: CatalogErrorCode.DATE_NOT_STARTED, params: { startsAt } });
      }
      return;
    case DateOutcome.CANCELLED: {
      const ended = endsAt(date.timing);
      if (!isBefore(now, ended)) {
        throw new DomainError({
          code: CatalogErrorCode.DATE_ALREADY_ENDED,
          params: { endsAt: ended },
        });
      }
      return;
    }
  }
}
