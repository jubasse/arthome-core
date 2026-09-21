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
  PublicationChecklistItem,
  PublicationReadiness,
  PublicationTransition,
  PublicationWarningItem,
} from './publication.js';
export {
  PUBLICATION_CHECKLIST_ITEMS,
  PUBLICATION_WARNING_ITEMS,
  assertTransitionAllowed,
  irreversiblePromiseBlocking,
  isEventDriven,
  nextPublicationTransitions,
  orderRankOf,
  publicationReadiness,
} from './publication.js';
