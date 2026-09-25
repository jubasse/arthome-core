/**
 * The vocabularies of the watch verdict — why someone may not watch, and what
 * they can do about it.
 *
 * ⚠ THEY LIVE HERE RATHER THAN IN `entitlement/` FOR A STRUCTURAL REASON, not a
 * tidiness one. `replay/` needs the denial reasons too, and `replay` is wave 3
 * while `entitlement` is wave 5: importing upward would invert the porting
 * order and put a late module on a early one's critical path. A vocabulary
 * belongs to nobody, so it belongs here — which is what `vocabulary/` is for.
 *
 * ⚠ THIS FILE IS A DECLARING FILE (see catalog.ts).
 */

/**
 * The denial reasons — one CODE per different screen.
 *
 * ⚠ THE FAILURE THIS RECORDS IS A COMPARISON THAT WAS FALSE IN SILENCE. The
 * declaration and the wire disagreed on spelling, so
 * `denialCode === WatchDenialReason.NO_SEAT` compared `'NO_SEAT'` to `'no_seat'`
 * and was false for every one of the eleven values — on the path this system
 * calls its most dangerous. A separator-insensitive reader cannot see a case
 * difference, which is why it outlived two passes looking for exactly this.
 *
 * ⚠ AND THE RESOLUTION WAS THE OPPOSITE OF WHAT THIS COMMENT USED TO CLAIM. It
 * argued the family was SCREAMING_SNAKE by exception to `code-conventions.md`
 * §5.2, citing peers that are no longer spelled that way — and one,
 * `STATE_CONFLICT`, that has never existed. D-067 settled it the other way:
 * **one dotted-lowercase form on the wire for every code**, with the accessor in
 * SCREAMING_SNAKE precisely so nothing has to compare a literal. This family is
 * not an exception to anything.
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

/**
 * How much of the date the verdict opens.
 *
 * It was three inline literals on `WatchVerdict.scope`, which was invisible
 * while `entitlement/index.ts` was itself a declaring file and the anti-E2 gate
 * skipped it. Moving the vocabularies here made that file scannable and the
 * literals surfaced at once — `full` also belongs to `PRICE_TIERS` and `none`
 * to `REPLAY_POLICIES`, so an inline copy is attributed to whichever declared
 * first. A vocabulary declared is a vocabulary the gate can reason about.
 */
export const WATCH_SCOPES = ['full', 'preview', 'none'] as const;
export type WatchScope = (typeof WATCH_SCOPES)[number];

export const WatchScope = {
  FULL: 'full',
  PREVIEW: 'preview',
  NONE: 'none',
} as const;

/**
 * The action that GETS OUT OF THE DEAD END — an empty state with no way out is
 * banned (principle no. 8).
 *
 * ⚠ COUPLED TO `WATCH_DENIAL_REASONS`, and the coupling is what makes this
 * vocabulary checkable rather than a matter of taste: every reason has an
 * action that answers it, every action answers at least one reason.
 * `WATCH_FALLBACK_FOR` in `entitlement/` states the pairing as data and the
 * spec asserts both directions.
 *
 * The seven are the reconciliation of two independently authored lists. Two
 * were the contract's and each earns its place against a named reason:
 * `join_waitlist` answers `NO_SEAT` once sold out, and `see_replay_policy`
 * answers `NO_REPLAY`, where sending the viewer to another date answers the
 * wrong question.
 *
 * A third, `watch_preview`, was proposed and is withdrawn — **and what it was
 * compensating for is the finding worth keeping.** It answered no refusal: a
 * viewer who can still watch a preview is not refused, the verdict ALLOWS them.
 * It existed because `WatchVerdict` had no way to say "allowed, but only as a
 * preview", so preview-ness was inferred from `previewSecondsLeft > 0` on three
 * storefronts instead of being served once. The fix was `WatchVerdict.scope`,
 * not a fallback action. **When a vocabulary member answers nothing, look for
 * the field that is missing**: the symptom shows up in the vocabulary and the
 * cause is elsewhere.
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
