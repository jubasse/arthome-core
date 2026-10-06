/**
 * Streaming vocabularies: the run desk's check, who raised an incident, and the service's own
 * bookkeeping of a playback lease and a recorded replay.
 *
 * A declaring file: `arthome-check-enums` reports any copy of these values elsewhere.
 */
/** Why a technical check failed, in the order a run desk reads them (D-114). */
export declare const TECHNICAL_CHECK_FAILURES: readonly ["no_feed", "codec_not_carried", "bitrate_below_floor"];
export type TechnicalCheckFailure = (typeof TECHNICAL_CHECK_FAILURES)[number];
export declare const TechnicalCheckFailure: {
    readonly NO_FEED: "no_feed";
    readonly CODEC_NOT_CARRIED: "codec_not_carried";
    readonly BITRATE_BELOW_FLOOR: "bitrate_below_floor";
};
/** Who raised an incident: the run desk by hand, or the channel's automatic hold screen. */
export declare const INCIDENT_TRIGGERS: readonly ["manual", "auto"];
export type IncidentTrigger = (typeof INCIDENT_TRIGGERS)[number];
export declare const IncidentTrigger: {
    readonly MANUAL: "manual";
    readonly AUTO: "auto";
};
/** A playback lease's life (`data-model.md` §5.4). */
export declare const PLAYBACK_SESSION_STATES: readonly ["active", "released", "expired", "revoked"];
export type PlaybackSessionState = (typeof PLAYBACK_SESSION_STATES)[number];
export declare const PlaybackSessionState: {
    readonly ACTIVE: "active";
    readonly RELEASED: "released";
    readonly EXPIRED: "expired";
    readonly REVOKED: "revoked";
};
/** A recorded replay file's life, from the live's recording to its deletion. */
export declare const REPLAY_ASSET_STATES: readonly ["recording", "processing", "ready", "deleting", "deleted", "failed"];
export type ReplayAssetState = (typeof REPLAY_ASSET_STATES)[number];
export declare const ReplayAssetState: {
    readonly RECORDING: "recording";
    readonly PROCESSING: "processing";
    readonly READY: "ready";
    readonly DELETING: "deleting";
    readonly DELETED: "deleted";
    readonly FAILED: "failed";
};
//# sourceMappingURL=streaming.d.ts.map