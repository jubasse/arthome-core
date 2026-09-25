/**
 * `decideWatch` — the most dangerous value in the system.
 *
 * Five sources (holding a seat, the date's state, territorial rights, replay policy,
 * subscription plan), shown on every card of every surface: candidate number one for "computed
 * twice".
 *
 * ⚠ One implementation, two evaluation sites, one authority. At the BFF the verdict paints a
 * card without a second round trip and is INDICATIVE, which the contract says; in `streaming`,
 * when the player opens, it is the only authoritative evaluation, because it is the only one
 * that produces a token. Both sides speak the same refusal vocabulary, so a card announcing
 * "subscription required" and a player refusing say the same code.
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
 * Which actions may answer which refusal — the coupling, as data. Every reason has at least one
 * action that answers it and every action answers at least one reason; the spec asserts both
 * directions, and anything surviving without a partner is what to argue about.
 *
 * ⚠ This table is the function's RANGE, not a menu of what a screen might offer: an action
 * belongs on a row if `decideWatch` can return it for that reason. Hence `PREVIEW_EXHAUSTED`
 * carries `join_waitlist` and not `subscribe` — subscribing is a real way out of a spent
 * preview, but the function never returns it there, and a table listing what the function
 * cannot produce stops being checkable against the function.
 *
 * ⚠ The keys are computed, and were bare literals until the values became translation keys: the
 * day `NO_SEAT` became `watch.no_seat`, all eleven were wrong at once and `tsc` caught all
 * eleven. That is what the `Record` keyed by the union is for.
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
     * Is a waiting list open? It changes the way out of `NO_SEAT` from "buy one" to "join the
     * list". The fact was already served on availability; the verdict could not express it, so
     * every sold-out date offered a button that leads nowhere.
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
     * ⚠ Never exceeds 60 seconds, and the entitlement is never cached to disk: it expires and it
     * depends on territory and on the screen limit. One re-read from disk is a wrong entitlement.
     */
    readonly validUntil: Instant;
}
/**
 * The watch verdict. The order of the refusals is a decision: most definitive first, so the
 * message shown is the most useful one — telling someone with no seat "out of territory" is
 * truer than "no seat", since buying a seat would not unblock them (`storefront-web` Q19).
 */
export declare function decideWatch(input: WatchInput): WatchVerdict;
/**
 * The concurrent-screen ceiling, derived from the plan. `multi-screen` is an execution
 * constraint that forces a server-side count: `ticketing` publishes the ceiling, `streaming`
 * enforces it with a lease that expires.
 */
export declare function concurrentStreamsAllowedFor(planOpenings: readonly PlanOpening[]): number;
/**
 * The free-preview budget, counted down by the server, per account.
 *
 * `storefront-web` Q20: a preview you extend by reloading the page is not a preview, and
 * `storefront-mobile` Q6 adds that a reinstall resets a client-side counter. Per account rather
 * than per device, or a household with four devices gets four previews.
 */
export declare const PREVIEW_BUDGET_SECONDS = 300;
export declare function previewSecondsLeft(secondsUsed: number): number;
//# sourceMappingURL=index.d.ts.map