/**
 * Catalogue vocabularies: what is published, what is broadcast, and what decides
 * their state.
 *
 * A declaring file: `arthome-check-enums` reports any copy of these values
 * elsewhere, so rules import the named members below, never a string literal.
 */
/** The channel's act; `catalogue.json` has authority (D2). */
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
 * The technical axis, and nothing else. A run desk has no "cancelled" state: it
 * has a stage that is sending nothing, and the outcome is `DATE_OUTCOMES` (E4).
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
 * The outcome — a fact about the performance, never rewritten, and it takes
 * precedence over the other two axes.
 */
export declare const DATE_OUTCOMES: readonly ["postponed", "cancelled", "interrupted"];
export type DateOutcome = (typeof DATE_OUTCOMES)[number];
export declare const DateOutcome: {
    readonly POSTPONED: "postponed";
    readonly CANCELLED: "cancelled";
    readonly INTERRUPTED: "interrupted";
};
/**
 * The fourth value, derived: what the badge says.
 *
 * Eleven values, because the studio also shows dates that are not public yet.
 * `draft`, `reserve` and `technical` deliberately carry the same string as the
 * matching publication state: when no later axis takes over, the displayed state
 * is the publication state.
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
 * The promise made before purchase — what justifies the price difference.
 *
 * `sub` and `off` from the mockups are not vocabulary (E2): `helpers.stateOf`
 * tested `policy !== 'none'`, so a date created with `off` would never have been
 * recognised as having no replay.
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
 * A code, never a sentence: `geography.rightsPolicy.blackoutReasons[]` carries
 * `label` and `labelEn`, prose written inside the data where everything else
 * goes through `enums.*` (E8).
 */
export declare const BLACKOUT_REASONS: readonly ["co_production", "broadcaster", "festival"];
export type BlackoutReason = (typeof BLACKOUT_REASONS)[number];
export declare const BlackoutReason: {
    readonly CO_PRODUCTION: "co_production";
    readonly BROADCASTER: "broadcaster";
    readonly FESTIVAL: "festival";
};
/**
 * The real vocabulary, corrected (D1). `taxonomy.json` declares
 * `none | light | helpful`, but `essential` — absent from it — is carried by five
 * shows and is what `hasLanguageBarrier` tests, while `light` is used nowhere.
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
/** The cause, a vocabulary distinct from the outcome. */
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