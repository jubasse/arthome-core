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
export declare const PUBLICATION_STATES: readonly ["draft", "reserve", "scheduled", "technical", "live", "ended", "replay_online"];
export type PublicationState = (typeof PUBLICATION_STATES)[number];
export declare const PublicationState: {
    readonly DRAFT: "draft";
    readonly RESERVE: "reserve";
    readonly SCHEDULED: "scheduled";
    readonly TECHNICAL: "technical";
    readonly LIVE: "live";
    readonly ENDED: "ended";
    readonly REPLAY_ONLINE: "replay_online";
};
/**
 * The TECHNICAL axis, and nothing else.
 *
 * `postponed` and `cancelled` are REMOVED: they were echoes of `DateOutcome`
 * lodged in the technical state — the same fault as `reported` sitting in the
 * sanctions field (E4). A run desk has no "cancelled" state: it has a stage
 * that is sending nothing.
 */
export declare const RUN_STATES: readonly ["idle", "rehearsal", "on_air", "interrupted", "ended"];
export type RunState = (typeof RUN_STATES)[number];
export declare const RunState: {
    readonly IDLE: "idle";
    readonly REHEARSAL: "rehearsal";
    readonly ON_AIR: "on_air";
    readonly INTERRUPTED: "interrupted";
    readonly ENDED: "ended";
};
/**
 * The OUTCOME. It is a FACT about the performance: never rewritten, never
 * erased. It takes precedence over the other two axes.
 */
export declare const DATE_OUTCOMES: readonly ["postponed", "cancelled", "interrupted"];
export type DateOutcome = (typeof DATE_OUTCOMES)[number];
export declare const DateOutcome: {
    readonly POSTPONED: "postponed";
    readonly CANCELLED: "cancelled";
    readonly INTERRUPTED: "interrupted";
};
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
export declare const DISPLAY_STATES: readonly ["draft", "reserve", "scheduled", "technical", "room_open", "live", "replay", "ended", "postponed", "cancelled", "interrupted"];
export type DisplayState = (typeof DISPLAY_STATES)[number];
export declare const DisplayState: {
    readonly DRAFT: "draft";
    readonly RESERVE: "reserve";
    readonly SCHEDULED: "scheduled";
    readonly TECHNICAL: "technical";
    readonly ROOM_OPEN: "room_open";
    readonly LIVE: "live";
    readonly REPLAY: "replay";
    readonly ENDED: "ended";
    readonly POSTPONED: "postponed";
    readonly CANCELLED: "cancelled";
    readonly INTERRUPTED: "interrupted";
};
/**
 * The PROMISE made before purchase — it is what justifies the price difference,
 * and the handover file makes it a principle.
 *
 * `sub` and `off`, from the mobile mockup and the creation wizard, are not
 * vocabulary (E2): `helpers.stateOf` literally tested `policy !== 'none'`, so a
 * date created with `off` would NEVER have been recognised as having no replay.
 */
export declare const REPLAY_POLICIES: readonly ["included", "subscription", "unit", "none"];
export type ReplayPolicy = (typeof REPLAY_POLICIES)[number];
export declare const ReplayPolicy: {
    readonly INCLUDED: "included";
    readonly SUBSCRIPTION: "subscription";
    readonly UNIT: "unit";
    readonly NONE: "none";
};
export declare const RIGHTS_SCOPES: readonly ["worldwide", "restricted"];
export type RightsScope = (typeof RIGHTS_SCOPES)[number];
export declare const RightsScope: {
    readonly WORLDWIDE: "worldwide";
    readonly RESTRICTED: "restricted";
};
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
export declare const BLACKOUT_REASONS: readonly ["co_production", "broadcaster", "festival"];
export type BlackoutReason = (typeof BLACKOUT_REASONS)[number];
export declare const BlackoutReason: {
    readonly CO_PRODUCTION: "co_production";
    readonly BROADCASTER: "broadcaster";
    readonly FESTIVAL: "festival";
};
/**
 * The REAL vocabulary, corrected (D1).
 *
 * `taxonomy.json` declares `none | light | helpful`. But `essential` — ABSENT
 * from the vocabulary — is carried by five shows, translated in the i18n files,
 * and `hasLanguageBarrier` MAKES IT ITS TEST. Meanwhile `light` is used
 * nowhere. A closed vocabulary that omits the value the surface's most visible
 * rule depends on is not a closed vocabulary.
 */
export declare const LANGUAGE_DEPENDENCIES: readonly ["none", "helpful", "essential"];
export type LanguageDependency = (typeof LANGUAGE_DEPENDENCIES)[number];
export declare const LanguageDependency: {
    readonly NONE: "none";
    readonly HELPFUL: "helpful";
    readonly ESSENTIAL: "essential";
};
/** The four incident kinds a viewer can see. */
export declare const INCIDENT_KINDS: readonly ["hold_screen", "postponed", "cancelled", "interrupted"];
export type IncidentKind = (typeof INCIDENT_KINDS)[number];
export declare const IncidentKind: {
    readonly HOLD_SCREEN: "hold_screen";
    readonly POSTPONED: "postponed";
    readonly CANCELLED: "cancelled";
    readonly INTERRUPTED: "interrupted";
};
/**
 * The CAUSE — a NEW vocabulary, distinct from the outcome.
 *
 * `catalogue.incidentMessages` knows only four entries, and they are OUTCOMES.
 * The mobile run desk distinguishes three more that exist in no vocabulary, and
 * `streaming.md` names a fourth.
 */
export declare const INCIDENT_CAUSES: readonly ["venue_feed_lost", "run_desk_disconnected", "bitrate_collapsed", "compatibility_worker_failed", "provider_error", "manual"];
export type IncidentCause = (typeof INCIDENT_CAUSES)[number];
export declare const IncidentCause: {
    readonly VENUE_FEED_LOST: "venue_feed_lost";
    readonly RUN_DESK_DISCONNECTED: "run_desk_disconnected";
    readonly BITRATE_COLLAPSED: "bitrate_collapsed";
    readonly COMPATIBILITY_WORKER_FAILED: "compatibility_worker_failed";
    readonly PROVIDER_ERROR: "provider_error";
    readonly MANUAL: "manual";
};
//# sourceMappingURL=catalog.d.ts.map