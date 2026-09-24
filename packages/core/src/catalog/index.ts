/** The catalogue: what is published, its displayed state, its rights, its language. */

export type { DateTiming, DisplayStateInput, DisplayStateResult } from './date-state.js';
export {
  displayStateOf,
  endsAt,
  isFullyOver,
  isRoomOpen,
  progressOf,
  replayEndsAt,
  roomOpensAt,
} from './date-state.js';

export type { TerritoryRights } from './rights.js';
export { blackoutReasonOf, isAvailableIn, restrictedRights, worldwideRights } from './rights.js';

export type { LanguageProfile } from './language.js';
export { hasLanguageBarrier, isLanguageNeutral, isUnderstandable } from './language.js';

export type {
  PublicationChecklistEntry,
  PublicationReadiness,
  PublicationTransition,
} from './publication.js';
export {
  PUBLICATION_CHECKLIST_ITEMS,
  // The NAMED members, beside the list — exported as a VALUE, which the type of
  // the same name above is not. Every other vocabulary in this package publishes
  // both; this one published only the list, so a consumer that wanted a member
  // had a literal as its only option.
  PublicationChecklistItem,
  isBlockingChecklistItem,
  assertTransitionAllowed,
  irreversiblePromiseBlocking,
  isEventDriven,
  nextPublicationTransitions,
  orderRankOf,
  publicationReadiness,
} from './publication.js';
