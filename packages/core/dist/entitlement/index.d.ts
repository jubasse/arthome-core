/**
 * `decideWatch` — THE MOST DANGEROUS VALUE IN THE SYSTEM.
 *
 * Five sources: holding a seat, the date's state, territorial rights, replay
 * policy, subscription plan. Shown on EVERY CARD of EVERY SURFACE. Candidate
 * number one for "computed twice".
 *
 * ⚠ WHAT DOES NOT PORT. `helpers.isWatchable(account, date)` assumes the client
 * HOLDS THE COMPLETE LIST OF THE ACCOUNT'S SEATS. `storefront-mobile` showed
 * that to be untenable: it grows, it changes while the application sleeps, and
 * the territorial decision does not belong to the client.
 *
 * ⚠ ONE IMPLEMENTATION, TWO EVALUATION SITES, ONE SINGLE AUTHORITY:
 *   - at the BFF, to paint a card without a second round trip. The verdict
 *     there is INDICATIVE AND NOT BINDING, and the contract says so;
 *   - in `streaming`, when the player opens. **The only authoritative
 *     evaluation**, because it is the only one that produces a token.
 *
 * And the same refusal vocabulary on both sides: a card announcing
 * "subscription required" and a player refusing for the same reason say the
 * SAME code.
 */
import type { DateTiming } from '../catalog/date-state.js';
import { type TerritoryRights } from '../catalog/rights.js';
import type { Instant } from '../kernel/clock.js';
import { DateOutcome } from '../vocabulary/catalog.js';
import type { PublicationState, RunState } from '../vocabulary/catalog.js';
import { PlanOpening } from '../vocabulary/commerce.js';
import { WatchDenialReason, WatchFallbackAction, WatchScope } from '../vocabulary/entitlement.js';
export { WATCH_DENIAL_REASONS, WATCH_FALLBACK_ACTIONS, WATCH_SCOPES, WatchDenialReason, WatchFallbackAction, WatchScope, } from '../vocabulary/entitlement.js';
/**
 * WHICH ACTIONS MAY ANSWER WHICH REFUSAL — the coupling, as data.
 *
 * A fallback action exists to answer a denial reason, so the two vocabularies
 * are coupled and the merge is checkable rather than a matter of taste:
 *
 *   every reason has at least one action that answers it, and
 *   every action answers at least one reason.
 *
 * The spec asserts both directions. Anything surviving without a partner is
 * what to argue about — which is how `watch_preview` was dropped from the
 * merge with the contract: it answers no refusal, because a preview still
 * available is an ALLOWED verdict with `scope: 'preview'`, not a dead end with
 * a way out.
 */
/**
 * ⚠ THIS TABLE IS THE FUNCTION'S RANGE, NOT A MENU OF EVERYTHING A SCREEN MIGHT
 * OFFER. That is what settles which actions a row carries: an action belongs on
 * a row if `decideWatch` can RETURN it for that reason, not if a designer could
 * reasonably put it on that screen.
 *
 * It is why `PREVIEW_EXHAUSTED` carries `join_waitlist` and not `subscribe`.
 * Subscribing is a real way out of a spent preview — a plan granting
 * `all_lives` opens the date — but `decideWatch` never returns it there, and a
 * table listing what the function cannot produce stops being checkable against
 * the function. `join_waitlist` stays because sold-out-and-spent is reachable
 * and `buy_seat` there is the button that leads nowhere.
 */
export declare const WATCH_FALLBACK_FOR: Readonly<Record<WatchDenialReason, readonly WatchFallbackAction[]>>;
/** The FIVE inputs, named. None is guessed, none is global. */
export interface WatchInput {
    readonly holdsSeat: boolean;
    readonly planOpenings: readonly PlanOpening[];
    readonly concurrentStreamsOpen: number;
    readonly concurrentStreamsAllowed: number;
    readonly previewSecondsLeft: number;
    readonly viewerCountry: string;
    readonly rights: TerritoryRights;
    readonly timing: DateTiming;
    readonly publicationState: PublicationState;
    readonly runState: RunState | null;
    readonly outcome: DateOutcome | null;
    readonly replayOnSale: boolean;
    /**
     * Is a waiting list open on this date? It changes the WAY OUT of `NO_SEAT`
     * from "buy one" to "join the list", and the two are different screens. The
     * fact was already served (`waitlist_count` on availability); the verdict
     * simply could not express it, so every sold-out date offered a button that
     * leads nowhere.
     */
    readonly waitlistOpen: boolean;
    readonly now: Instant;
}
export interface WatchVerdict {
    readonly allowed: boolean;
    /** `preview` when access is a bounded free preview. */
    readonly scope: WatchScope;
    readonly reason: WatchDenialReason | null;
    readonly fallback: WatchFallbackAction;
    readonly previewSecondsLeft: number;
    /**
     * ⚠ NEVER EXCEEDS 60 SECONDS, and the entitlement is NEVER cached to disk: it
     * expires, it depends on territory, it depends on the screen limit. An
     * entitlement re-read from disk is a WRONG entitlement.
     */
    readonly validUntil: Instant;
}
/**
 * The order of the refusals is a DECISION, not a convenience.
 *
 * It runs from the most definitive to the most recoverable, so that the message
 * shown is the most useful one: telling someone with no seat "out of territory"
 * is truer than "no seat", since buying a seat would not unblock them.
 * `storefront-web` Q19 asked for this without putting it that way — it was the
 * truth-table test that brought it out.
 */
export declare function decideWatch(input: WatchInput): WatchVerdict;
/**
 * The concurrent-screen ceiling, derived from the plan.
 *
 * `multi-screen` is not a marketing line: it is an EXECUTION CONSTRAINT that
 * forces a server-side count. `ticketing` publishes the ceiling; `streaming`
 * enforces it with a lease that expires.
 */
export declare function concurrentStreamsAllowedFor(planOpenings: readonly PlanOpening[]): number;
/**
 * The free-preview budget — COUNTED DOWN BY THE SERVER, per ACCOUNT.
 *
 * `storefront-web` Q20: "a preview you extend by reloading the page is not a
 * preview". `storefront-mobile` Q6 adds that a reinstall would reset a
 * client-side counter to zero.
 *
 * Per ACCOUNT and not per device: otherwise a household with four devices gets
 * four previews.
 */
export declare const PREVIEW_BUDGET_SECONDS = 300;
export declare function previewSecondsLeft(secondsUsed: number): number;
//# sourceMappingURL=index.d.ts.map