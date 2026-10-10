/**
 * Streaming vocabularies: the run desk's check, who raised an incident, and the service's own
 * bookkeeping of a playback lease and a recorded replay.
 *
 * A declaring file: `arthome-check-enums` reports any copy of these values elsewhere.
 */

/** Why a technical check failed, in the order a run desk reads them (D-114). */
export const TECHNICAL_CHECK_FAILURES = [
  'no_feed',
  'codec_not_carried',
  'bitrate_below_floor',
] as const;
export type TechnicalCheckFailure = (typeof TECHNICAL_CHECK_FAILURES)[number];

export const TechnicalCheckFailure = {
  NO_FEED: 'no_feed',
  CODEC_NOT_CARRIED: 'codec_not_carried',
  BITRATE_BELOW_FLOOR: 'bitrate_below_floor',
} as const;

/** Who raised an incident: the run desk by hand, or the channel's automatic hold screen. */
export const INCIDENT_TRIGGERS = ['manual', 'auto'] as const;
export type IncidentTrigger = (typeof INCIDENT_TRIGGERS)[number];

export const IncidentTrigger = {
  MANUAL: 'manual',
  AUTO: 'auto',
} as const;

/** A playback lease's life (`data-model.md` §5.4). */
export const PLAYBACK_SESSION_STATES = ['active', 'released', 'expired', 'revoked'] as const;
export type PlaybackSessionState = (typeof PLAYBACK_SESSION_STATES)[number];

export const PlaybackSessionState = {
  ACTIVE: 'active',
  RELEASED: 'released',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
} as const;

/** A recorded replay file's life, from the live's recording to its deletion. */
export const REPLAY_ASSET_STATES = [
  'recording',
  'processing',
  'ready',
  'deleting',
  'deleted',
  'failed',
] as const;
export type ReplayAssetState = (typeof REPLAY_ASSET_STATES)[number];

export const ReplayAssetState = {
  RECORDING: 'recording',
  PROCESSING: 'processing',
  READY: 'ready',
  DELETING: 'deleting',
  DELETED: 'deleted',
  FAILED: 'failed',
} as const;
