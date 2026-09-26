/**
 * The vocabularies of the watch verdict — why someone may not watch, and what
 * they can do about it.
 *
 * They live here rather than in `entitlement/` because `replay/` (wave 3) needs
 * the denial reasons too, and importing from `entitlement/` (wave 5) would
 * invert the porting order.
 */
/**
 * The denial reasons — one code per different screen.
 *
 * The wire form is dotted-lowercase and the accessor SCREAMING_SNAKE (D-067)
 * precisely so that nothing compares a literal: when the two diverged here,
 * `denialCode === WatchDenialReason.NO_SEAT` compared `'NO_SEAT'` to `'no_seat'`
 * and was false for all eleven values, through two passes looking for it.
 */
export declare const WATCH_DENIAL_REASONS: readonly ["watch.no_seat", "watch.room_not_open", "watch.out_of_territory", "watch.subscription_required", "watch.no_replay", "watch.replay_expired", "watch.replay_not_on_sale", "watch.preview_exhausted", "watch.concurrent_limit_reached", "watch.date_cancelled", "watch.not_published"];
export type WatchDenialReason = (typeof WATCH_DENIAL_REASONS)[number];
export declare const WatchDenialReason: {
    readonly NO_SEAT: "watch.no_seat";
    readonly ROOM_NOT_OPEN: "watch.room_not_open";
    readonly OUT_OF_TERRITORY: "watch.out_of_territory";
    readonly SUBSCRIPTION_REQUIRED: "watch.subscription_required";
    readonly NO_REPLAY: "watch.no_replay";
    readonly REPLAY_EXPIRED: "watch.replay_expired";
    readonly REPLAY_NOT_ON_SALE: "watch.replay_not_on_sale";
    readonly PREVIEW_EXHAUSTED: "watch.preview_exhausted";
    readonly CONCURRENT_LIMIT_REACHED: "watch.concurrent_limit_reached";
    readonly DATE_CANCELLED: "watch.date_cancelled";
    readonly NOT_PUBLISHED: "watch.not_published";
};
/** How much of the date the verdict opens. */
export declare const WATCH_SCOPES: readonly ["full", "preview", "none"];
export type WatchScope = (typeof WATCH_SCOPES)[number];
export declare const WatchScope: {
    readonly FULL: "full";
    readonly PREVIEW: "preview";
    readonly NONE: "none";
};
/**
 * The action that gets out of the dead end — an empty state with no way out is
 * banned (principle no. 8).
 *
 * Coupled to `WATCH_DENIAL_REASONS`: every reason has an action that answers
 * it, every action answers at least one reason. `WATCH_FALLBACK_FOR` states the
 * pairing as data and the spec asserts both directions.
 */
export declare const WATCH_FALLBACK_ACTIONS: readonly ["buy_seat", "join_waitlist", "subscribe", "see_replay_policy", "see_other_dates", "release_a_screen", "none"];
export type WatchFallbackAction = (typeof WATCH_FALLBACK_ACTIONS)[number];
export declare const WatchFallbackAction: {
    readonly BUY_SEAT: "buy_seat";
    readonly JOIN_WAITLIST: "join_waitlist";
    readonly SUBSCRIBE: "subscribe";
    readonly SEE_REPLAY_POLICY: "see_replay_policy";
    readonly SEE_OTHER_DATES: "see_other_dates";
    readonly RELEASE_A_SCREEN: "release_a_screen";
    readonly NONE: "none";
};
//# sourceMappingURL=entitlement.d.ts.map