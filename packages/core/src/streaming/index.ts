/** Streaming: the playback timings and the preview's spending, the run's moves, its check and its automatic end. */

export {
  ENTITLEMENT_PROJECTION_MAX_STALENESS_SECONDS,
  PLAYBACK_LEASE_SECONDS,
  PLAYBACK_RENEWAL_INTERVAL_SECONDS,
  PLAYBACK_TOKEN_LIFETIME_SECONDS,
  isPreviewBudgetSpending,
  playbackLeaseExpiresAt,
  playbackTokenExpiresAt,
  previewRenewAfterSeconds,
  previewSecondsSpent,
  previewTokenExpiresAt,
} from './playback.js';

export type { TechnicalCheckProbe } from './run.js';
export {
  HOLD_SCREEN_AUTO_AFTER_SECONDS_DEFAULT,
  PUBLISHER_GRACE_SECONDS,
  RUN_AUTO_END_MINUTES,
  RUN_TRANSITIONS,
  TECHNICAL_CHECK_BITRATE_FLOOR_KBPS_DEFAULT,
  assertRunTransition,
  holdScreenLiftsOnFeedReturn,
  runAutoEndsAt,
  technicalCheckFailuresOf,
} from './run.js';
