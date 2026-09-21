/**
 * Catalogue vocabularies: what is published, what is broadcast, and what
 * decides their state.
 *
 * ⚠ THIS FILE IS A DECLARING FILE. `arthome-check-enums` discovers the values
 * here and reports any copy elsewhere in the repository. That is why rules
 * import the named-member objects below and never write a string literal.
 */

/**
 * The channel's act. Vocabulary from `catalogue.json`, which has authority (D2).
 * `replay-online` says what `replay` does not: the replay is ON SALE.
 * The parallel tables in the two studio mockups — `hidden`, `sched`, `tech`,
 * `done` — are never carried over.
 */
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
 * The TECHNICAL axis, and nothing else.
 *
 * `postponed` and `cancelled` are REMOVED: they were echoes of `DateOutcome`
 * lodged in the technical state — the same fault as `reported` sitting in the
 * sanctions field (E4). A run desk has no "cancelled" state: it has a stage
 * that is sending nothing.
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
 * The OUTCOME. It is a FACT about the performance: never rewritten, never
 * erased. It takes precedence over the other two axes.
 */
export const DATE_OUTCOMES = ['postponed', 'cancelled', 'interrupted'] as const;
export type DateOutcome = (typeof DATE_OUTCOMES)[number];

export const DateOutcome = {
  POSTPONED: 'postponed',
  CANCELLED: 'cancelled',
  INTERRUPTED: 'interrupted',
} as const;

/**
 * The FOURTH value, derived and unique — WHAT THE BADGE SAYS.
 *
 * None of the three axes carried it, and every surface recomposed the hierarchy
 * its own way: the very definition of a value computed twice.
 *
 * ⚠ ELEVEN values, not eight. An earlier version of this vocabulary held only
 * the PUBLIC states — which forgot that the studio also shows dates that are
 * not public yet, and that `displayState` is prescribed on BOTH products, the
 * studio first. So `draft`, `reserve` and `technical` carry the SAME string as
 * the matching publication state: when no later axis takes over, the displayed
 * state IS the publication state. Sharing the value is deliberate, exactly as
 * it is for the three outcomes.
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
 * The PROMISE made before purchase — it is what justifies the price difference,
 * and the handover file makes it a principle.
 *
 * `sub` and `off`, from the mobile mockup and the creation wizard, are not
 * vocabulary (E2): `helpers.stateOf` literally tested `policy !== 'none'`, so a
 * date created with `off` would NEVER have been recognised as having no replay.
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
 * A CODE, never a sentence.
 *
 * `geography.rightsPolicy.blackoutReasons[]` currently carries `label` and
 * `labelEn` — prose written INSIDE the data, while everything else goes through
 * `enums.*`. That is an i18n leak in the model (E8).
 *
 * Spelling: `snake_case`, like every value on the wire — so `co_production`.
 *
 * ⚠ THIS COMMENT SAID THE OPPOSITE UNTIL `code-conventions.md` §5.2 REVERSED IT,
 * and it went on saying it three lines above a constant that had already moved.
 * It is recorded rather than quietly swapped, because the reversal has a
 * distinction worth keeping (D-034): `shared/` → `@arthome/core` is a ONE-TIME
 * PORT, which already normalises by design (D1 drops `light` and adds
 * `essential`, D7 turns relative offsets into instants); `core` ↔ the wire is a
 * LIVE BOUNDARY, and only a live boundary turns a mapping into a parallel table
 * with a codec's costume. K6 never required kebab — it required ONE spelling,
 * and its defect was the divergence.
 */
export const BLACKOUT_REASONS = ['co_production', 'broadcaster', 'festival'] as const;
export type BlackoutReason = (typeof BLACKOUT_REASONS)[number];

export const BlackoutReason = {
  CO_PRODUCTION: 'co_production',
  BROADCASTER: 'broadcaster',
  FESTIVAL: 'festival',
} as const;

/**
 * The REAL vocabulary, corrected (D1).
 *
 * `taxonomy.json` declares `none | light | helpful`. But `essential` — ABSENT
 * from the vocabulary — is carried by five shows, translated in the i18n files,
 * and `hasLanguageBarrier` MAKES IT ITS TEST. Meanwhile `light` is used
 * nowhere. A closed vocabulary that omits the value the surface's most visible
 * rule depends on is not a closed vocabulary.
 */
export const LANGUAGE_DEPENDENCIES = ['none', 'helpful', 'essential'] as const;
export type LanguageDependency = (typeof LANGUAGE_DEPENDENCIES)[number];

export const LanguageDependency = {
  NONE: 'none',
  HELPFUL: 'helpful',
  ESSENTIAL: 'essential',
} as const;

/** The four incident kinds a viewer can see. */
export const INCIDENT_KINDS = [
  'hold_screen',
  'postponed',
  'cancelled',
  'interrupted',
] as const;
export type IncidentKind = (typeof INCIDENT_KINDS)[number];

export const IncidentKind = {
  HOLD_SCREEN: 'hold_screen',
  POSTPONED: 'postponed',
  CANCELLED: 'cancelled',
  INTERRUPTED: 'interrupted',
} as const;

/**
 * The CAUSE — a NEW vocabulary, distinct from the outcome.
 *
 * `catalogue.incidentMessages` knows only four entries, and they are OUTCOMES.
 * The mobile run desk distinguishes three more that exist in no vocabulary, and
 * `streaming.md` names a fourth.
 */
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
