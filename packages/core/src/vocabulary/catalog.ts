/**
 * Catalogue vocabularies: what is published, what is broadcast, and what decides
 * their state.
 *
 * ⚠ A declaring file: `arthome-check-enums` reports any copy of these values
 * elsewhere, so rules import the named members below, never a string literal.
 */

/** The channel's act; `catalogue.json` has authority (D2). */
export const PUBLICATION_STATES = [
  'draft',
  'reserve',
  'scheduled',
  'technical',
  'live',
  'ended',
  'replay_online',
] as const;
export type PublicationState = (typeof PUBLICATION_STATES)[number];

export const PublicationState = {
  DRAFT: 'draft',
  RESERVE: 'reserve',
  SCHEDULED: 'scheduled',
  TECHNICAL: 'technical',
  LIVE: 'live',
  ENDED: 'ended',
  REPLAY_ONLINE: 'replay_online',
} as const;

/**
 * The technical axis, and nothing else. A run desk has no "cancelled" state: it
 * has a stage that is sending nothing, and the outcome is `DATE_OUTCOMES` (E4).
 */
export const RUN_STATES = ['idle', 'rehearsal', 'on_air', 'interrupted', 'ended'] as const;
export type RunState = (typeof RUN_STATES)[number];

export const RunState = {
  IDLE: 'idle',
  REHEARSAL: 'rehearsal',
  ON_AIR: 'on_air',
  INTERRUPTED: 'interrupted',
  ENDED: 'ended',
} as const;

/**
 * The outcome — a fact about the performance, never rewritten, and it takes
 * precedence over the other two axes.
 */
export const DATE_OUTCOMES = ['postponed', 'cancelled', 'interrupted'] as const;
export type DateOutcome = (typeof DATE_OUTCOMES)[number];

export const DateOutcome = {
  POSTPONED: 'postponed',
  CANCELLED: 'cancelled',
  INTERRUPTED: 'interrupted',
} as const;

/**
 * The fourth value, derived: what the badge says.
 *
 * ⚠ Eleven values, because the studio also shows dates that are not public yet.
 * `draft`, `reserve` and `technical` deliberately carry the same string as the
 * matching publication state: when no later axis takes over, the displayed state
 * is the publication state.
 */
export const DISPLAY_STATES = [
  'draft',
  'reserve',
  'scheduled',
  'technical',
  'room_open',
  'live',
  'replay',
  'ended',
  'postponed',
  'cancelled',
  'interrupted',
] as const;
export type DisplayState = (typeof DISPLAY_STATES)[number];

export const DisplayState = {
  DRAFT: 'draft',
  RESERVE: 'reserve',
  SCHEDULED: 'scheduled',
  TECHNICAL: 'technical',
  ROOM_OPEN: 'room_open',
  LIVE: 'live',
  REPLAY: 'replay',
  ENDED: 'ended',
  POSTPONED: 'postponed',
  CANCELLED: 'cancelled',
  INTERRUPTED: 'interrupted',
} as const;

/**
 * The promise made before purchase — what justifies the price difference.
 *
 * `sub` and `off` from the mockups are not vocabulary (E2): `helpers.stateOf`
 * tested `policy !== 'none'`, so a date created with `off` would never have been
 * recognised as having no replay.
 */
export const REPLAY_POLICIES = ['included', 'subscription', 'unit', 'none'] as const;
export type ReplayPolicy = (typeof REPLAY_POLICIES)[number];

export const ReplayPolicy = {
  INCLUDED: 'included',
  SUBSCRIPTION: 'subscription',
  UNIT: 'unit',
  NONE: 'none',
} as const;

export const RIGHTS_SCOPES = ['worldwide', 'restricted'] as const;
export type RightsScope = (typeof RIGHTS_SCOPES)[number];

export const RightsScope = {
  WORLDWIDE: 'worldwide',
  RESTRICTED: 'restricted',
} as const;

/**
 * A code, never a sentence: `geography.rightsPolicy.blackoutReasons[]` carries
 * `label` and `labelEn`, prose written inside the data where everything else
 * goes through `enums.*` (E8).
 */
export const BLACKOUT_REASONS = ['co_production', 'broadcaster', 'festival'] as const;
export type BlackoutReason = (typeof BLACKOUT_REASONS)[number];

export const BlackoutReason = {
  CO_PRODUCTION: 'co_production',
  BROADCASTER: 'broadcaster',
  FESTIVAL: 'festival',
} as const;

/**
 * The real vocabulary, corrected (D1). `taxonomy.json` declares
 * `none | light | helpful`, but `essential` — absent from it — is carried by five
 * shows and is what `hasLanguageBarrier` tests, while `light` is used nowhere.
 */
export const LANGUAGE_DEPENDENCIES = ['none', 'helpful', 'essential'] as const;
export type LanguageDependency = (typeof LANGUAGE_DEPENDENCIES)[number];

export const LanguageDependency = {
  NONE: 'none',
  HELPFUL: 'helpful',
  ESSENTIAL: 'essential',
} as const;

/** The four incident kinds a viewer can see. */
export const INCIDENT_KINDS = ['hold_screen', 'postponed', 'cancelled', 'interrupted'] as const;
export type IncidentKind = (typeof INCIDENT_KINDS)[number];

export const IncidentKind = {
  HOLD_SCREEN: 'hold_screen',
  POSTPONED: 'postponed',
  CANCELLED: 'cancelled',
  INTERRUPTED: 'interrupted',
} as const;

/** The cause, a vocabulary distinct from the outcome. */
export const INCIDENT_CAUSES = [
  'venue_feed_lost',
  'run_desk_disconnected',
  'bitrate_collapsed',
  'compatibility_worker_failed',
  'provider_error',
  'manual',
] as const;
export type IncidentCause = (typeof INCIDENT_CAUSES)[number];

export const IncidentCause = {
  VENUE_FEED_LOST: 'venue_feed_lost',
  RUN_DESK_DISCONNECTED: 'run_desk_disconnected',
  BITRATE_COLLAPSED: 'bitrate_collapsed',
  COMPATIBILITY_WORKER_FAILED: 'compatibility_worker_failed',
  PROVIDER_ERROR: 'provider_error',
  MANUAL: 'manual',
} as const;
