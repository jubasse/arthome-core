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
 * ⚠ SCREAMING_SNAKE, deliberately against `code-conventions.md` §5.2's
 * lowercase rule for a literal union. This is not a domain vocabulary, it is a
 * REFUSAL CODE FAMILY (D-036): it rides on `denialCode` beside `reasonParams`,
 * which is the error envelope's `code` + `params` shape, and it sits alongside
 * `PRICE_STALE`, `STATE_CONFLICT` and `SIGNED_OUT_ELSEWHERE`, none of which is
 * lowercase anywhere.
 *
 * It was lowercase here and SCREAMING on the wire, which made
 * `denialCode === WatchDenialReason.NO_SEAT` compare `'NO_SEAT'` to `'no_seat'`
 * and be **false in silence** — on the value this system calls its most
 * dangerous.
 */
export declare const WATCH_DENIAL_REASONS: readonly ["NO_SEAT", "ROOM_NOT_OPEN", "OUT_OF_TERRITORY", "SUBSCRIPTION_REQUIRED", "NO_REPLAY", "REPLAY_EXPIRED", "REPLAY_NOT_ON_SALE", "PREVIEW_EXHAUSTED", "CONCURRENT_LIMIT_REACHED", "DATE_CANCELLED", "NOT_PUBLISHED"];
export type WatchDenialReason = (typeof WATCH_DENIAL_REASONS)[number];
export declare const WatchDenialReason: {
    readonly NO_SEAT: "NO_SEAT";
    readonly ROOM_NOT_OPEN: "ROOM_NOT_OPEN";
    readonly OUT_OF_TERRITORY: "OUT_OF_TERRITORY";
    readonly SUBSCRIPTION_REQUIRED: "SUBSCRIPTION_REQUIRED";
    readonly NO_REPLAY: "NO_REPLAY";
    readonly REPLAY_EXPIRED: "REPLAY_EXPIRED";
    readonly REPLAY_NOT_ON_SALE: "REPLAY_NOT_ON_SALE";
    readonly PREVIEW_EXHAUSTED: "PREVIEW_EXHAUSTED";
    readonly CONCURRENT_LIMIT_REACHED: "CONCURRENT_LIMIT_REACHED";
    readonly DATE_CANCELLED: "DATE_CANCELLED";
    readonly NOT_PUBLISHED: "NOT_PUBLISHED";
};
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
export declare const WATCH_SCOPES: readonly ["full", "preview", "none"];
export type WatchScope = (typeof WATCH_SCOPES)[number];
export declare const WatchScope: {
    readonly FULL: "full";
    readonly PREVIEW: "preview";
    readonly NONE: "none";
};
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