/**
 * `decideWatch` — the most dangerous value in the system.
 *
 * Five sources (holding a seat, the date's state, territorial rights, replay policy,
 * subscription plan), shown on every card of every surface: candidate number one for "computed
 * twice".
 *
 * One implementation, two evaluation sites, one authority. At the BFF the verdict paints a
 * card without a second round trip and is INDICATIVE, which the contract says; in `streaming`,
 * when the player opens, it is the only authoritative evaluation, because it is the only one
 * that produces a token. Both sides speak the same refusal vocabulary, so a card announcing
 * "subscription required" and a player refusing say the same code.
 */
import type { DateTiming } from '../catalog/date-state.js';
import { type TerritoryRights } from '../catalog/rights.js';
import type { Instant } from '../kernel/clock.js';
import { DateOutcome, RunState } from '../vocabulary/catalog.js';
import type { PublicationState } from '../vocabulary/catalog.js';
import { PlanOpening, SubscriptionState } from '../vocabulary/commerce.js';
import { WatchDenialReason, WatchFallbackAction, WatchScope } from '../vocabulary/entitlement.js';
export { WATCH_DENIAL_REASONS, WATCH_FALLBACK_ACTIONS, WATCH_SCOPES, WatchDenialReason, WatchFallbackAction, WatchScope, } from '../vocabulary/entitlement.js';
/**
 * Which actions may answer which refusal — the coupling, as data. Every reason has at least one
 * action that answers it and every action answers at least one reason; the spec asserts both
 * directions, and anything surviving without a partner is what to argue about.
 *
 * This table is the verdicts' RANGE, not a menu of what a screen might offer: an action belongs
 * on a row if a verdict can return it for that reason. `decideWatch` returns every reason but four:
 * `subscription_required`, `no_replay`, `replay_expired` and `replay_not_on_sale` are the replay's
 * verdict (`adr-replay.md` §10), and the spec holds the function to the other rows exactly. Hence
 * `PREVIEW_EXHAUSTED` carries `join_waitlist` and not `subscribe` — subscribing is a real way out
 * of a spent preview, but the function never returns it there, and a table listing what the
 * function cannot produce stops being checkable against the function.
 *
 * The keys are computed, and were bare literals until the values became translation keys: the
 * day `NO_SEAT` became `watch.no_seat`, all eleven were wrong at once and `tsc` caught all
 * eleven. That is what the `Record` keyed by the union is for.
 */
export declare const WATCH_FALLBACK_FOR: Readonly<Record<WatchDenialReason, readonly WatchFallbackAction[]>>;
/** What a viewer can do to get a seat on this date, which decides the seat action. */
export interface SeatStanding {
    readonly onPublicSale: boolean;
    /** Notified from the waiting list, inside the window, with pool seats left. */
    readonly priorityPoolOpen: boolean;
    readonly onWaitlist: boolean;
}
/** Ticketing's facts as numbers and an instant, so the standing needs none of its names. */
export interface SeatStandingFacts {
    readonly publicSeatsAvailable: number;
    readonly priorityPoolSeats: number;
    /** The end of the viewer's priority window, `null` when not notified. */
    readonly notifiedUntil: Instant | null;
    readonly onWaitlist: boolean;
    readonly now: Instant;
}
export declare function seatStandingOf(facts: SeatStandingFacts): SeatStanding;
/** The inputs, named. None is guessed, none is global. */
export interface WatchInput {
    readonly holdsSeat: boolean;
    /** The account held a seat on this date and holds no active one now: its own cancellation, an account deletion. */
    readonly seatExpired: boolean;
    /** `planOpeningsOf`'s result: what the subscription opens now, never its plan read past its state (D-125). */
    readonly planOpenings: readonly PlanOpening[];
    /**
     * The account's other live leases on the date. At an opening they are counted once the opening
     * has taken over the least recently renewed one (D-117), so an opening is never refused for the
     * ceiling while a lease remains to take over; the taken-over session's next renewal is refused.
     */
    readonly concurrentStreamsOpen: number;
    /** `concurrentStreamsAllowedFor` (D-108). */
    readonly concurrentStreamsAllowed: number;
    readonly previewSecondsLeft: number;
    readonly viewerCountry: string;
    readonly rights: TerritoryRights;
    readonly timing: DateTiming;
    readonly publicationState: PublicationState;
    readonly runState: RunState | null;
    readonly outcome: DateOutcome | null;
    /**
     * `null` when unknown: `streaming`'s projection holds no sale, so its authoritative evaluation
     * gets the generic sold-out way out. The verdict itself never depends on it; the BFF passes the
     * real standing so a card offers the right button.
     */
    readonly seatStanding: SeatStanding | null;
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
     * Never exceeds 60 seconds, and the entitlement is never cached to disk: it expires and it
     * depends on territory and on the screen limit. One re-read from disk is a wrong entitlement.
     */
    readonly validUntil: Instant;
}
/**
 * The watch verdict on a live. The order of the refusals is a decision: most definitive first, so
 * the message shown is the most useful one — telling someone with no seat "out of territory" is
 * truer than "no seat", since buying a seat would not unblock them (`storefront-web` Q19).
 */
export declare function decideWatch(input: WatchInput): WatchVerdict;
/**
 * The concurrent-screen ceiling on a date: the active seats held on it, or the plan's ceiling if
 * higher (D-108). `streaming` enforces it with a lease that expires.
 */
export declare function concurrentStreamsAllowedFor(planOpenings: readonly PlanOpening[], activeSeatsOnDate: number): number;
/** A subscription as `ticketing` records it: its state, what its plan opens, its paid period. */
export interface SubscriptionOpenings {
    readonly state: SubscriptionState;
    readonly opens: readonly PlanOpening[];
    readonly currentPeriodEnd: Instant;
}
/** What a subscription opens now. Every caller passes this, never `opens`, to `decideWatch` and `concurrentStreamsAllowedFor`. */
export declare function planOpeningsOf(subscription: SubscriptionOpenings, now: Instant): readonly PlanOpening[];
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