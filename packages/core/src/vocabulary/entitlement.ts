/**
 * The vocabularies of the watch verdict — why someone may not watch, and what
 * they can do about it.
 *
 * ⚠ They live here rather than in `entitlement/` because `replay/` (wave 3) needs
 * the denial reasons too, and importing from `entitlement/` (wave 5) would
 * invert the porting order.
 */

/**
 * The denial reasons — one code per different screen.
 *
 * ⚠ The wire form is dotted-lowercase and the accessor SCREAMING_SNAKE (D-067)
 * precisely so that nothing compares a literal: when the two diverged here,
 * `denialCode === WatchDenialReason.NO_SEAT` compared `'NO_SEAT'` to `'no_seat'`
 * and was false for all eleven values, through two passes looking for it.
 */
export const WATCH_DENIAL_REASONS = [
  'watch.no_seat',
  'watch.room_not_open',
  'watch.out_of_territory',
  'watch.subscription_required',
  'watch.no_replay',
  'watch.replay_expired',
  'watch.replay_not_on_sale',
  'watch.preview_exhausted',
  'watch.concurrent_limit_reached',
  'watch.date_cancelled',
  'watch.not_published',
] as const;
export type WatchDenialReason = (typeof WATCH_DENIAL_REASONS)[number];

export const WatchDenialReason = {
  NO_SEAT: 'watch.no_seat',
  ROOM_NOT_OPEN: 'watch.room_not_open',
  OUT_OF_TERRITORY: 'watch.out_of_territory',
  SUBSCRIPTION_REQUIRED: 'watch.subscription_required',
  NO_REPLAY: 'watch.no_replay',
  REPLAY_EXPIRED: 'watch.replay_expired',
  REPLAY_NOT_ON_SALE: 'watch.replay_not_on_sale',
  PREVIEW_EXHAUSTED: 'watch.preview_exhausted',
  CONCURRENT_LIMIT_REACHED: 'watch.concurrent_limit_reached',
  DATE_CANCELLED: 'watch.date_cancelled',
  NOT_PUBLISHED: 'watch.not_published',
} as const;

/** How much of the date the verdict opens. */
export const WATCH_SCOPES = ['full', 'preview', 'none'] as const;
export type WatchScope = (typeof WATCH_SCOPES)[number];

export const WatchScope = {
  FULL: 'full',
  PREVIEW: 'preview',
  NONE: 'none',
} as const;

/**
 * The action that gets out of the dead end — an empty state with no way out is
 * banned (principle no. 8).
 *
 * ⚠ Coupled to `WATCH_DENIAL_REASONS`: every reason has an action that answers
 * it, every action answers at least one reason. `WATCH_FALLBACK_FOR` states the
 * pairing as data and the spec asserts both directions.
 */
export const WATCH_FALLBACK_ACTIONS = [
  'buy_seat',
  'join_waitlist',
  'subscribe',
  'see_replay_policy',
  'see_other_dates',
  'release_a_screen',
  'none',
] as const;
export type WatchFallbackAction = (typeof WATCH_FALLBACK_ACTIONS)[number];

export const WatchFallbackAction = {
  BUY_SEAT: 'buy_seat',
  JOIN_WAITLIST: 'join_waitlist',
  SUBSCRIBE: 'subscribe',
  SEE_REPLAY_POLICY: 'see_replay_policy',
  SEE_OTHER_DATES: 'see_other_dates',
  RELEASE_A_SCREEN: 'release_a_screen',
  NONE: 'none',
} as const;
