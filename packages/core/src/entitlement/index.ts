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
import { publicDisplayStateOf } from '../catalog/date-state.js';
import { isAvailableIn, type TerritoryRights } from '../catalog/rights.js';
import type { Instant } from '../kernel/clock.js';
import { salesEndedBy, seatSalesEndAt } from '../ticketing/seats.js';
import { earliest, isBefore } from '../time/instant.js';
import { DateOutcome, DisplayState, ReplayPolicy, RunState } from '../vocabulary/catalog.js';
import type { PublicationState } from '../vocabulary/catalog.js';
import { PlanOpening, SubscriptionState } from '../vocabulary/commerce.js';
import { WatchDenialReason, WatchFallbackAction, WatchScope } from '../vocabulary/entitlement.js';

// Each name is both a union type and a named-member object, so one statement re-exports
// both: splitting an `export type` off shadows the value half (TS1362).
export {
  WATCH_DENIAL_REASONS,
  WATCH_FALLBACK_ACTIONS,
  WATCH_SCOPES,
  WatchDenialReason,
  WatchFallbackAction,
  WatchScope,
} from '../vocabulary/entitlement.js';

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
export const WATCH_FALLBACK_FOR: Readonly<
  Record<WatchDenialReason, readonly WatchFallbackAction[]>
> = {
  [WatchDenialReason.NO_SEAT]: [
    WatchFallbackAction.BUY_SEAT,
    WatchFallbackAction.JOIN_WAITLIST,
    WatchFallbackAction.NONE,
    WatchFallbackAction.SEE_OTHER_DATES,
  ],
  [WatchDenialReason.PREVIEW_EXHAUSTED]: [
    WatchFallbackAction.BUY_SEAT,
    WatchFallbackAction.JOIN_WAITLIST,
    WatchFallbackAction.NONE,
    WatchFallbackAction.SEE_OTHER_DATES,
  ],
  [WatchDenialReason.ROOM_NOT_OPEN]: [
    WatchFallbackAction.BUY_SEAT,
    WatchFallbackAction.JOIN_WAITLIST,
    WatchFallbackAction.NONE,
  ],
  [WatchDenialReason.SUBSCRIPTION_REQUIRED]: [WatchFallbackAction.SUBSCRIBE],
  [WatchDenialReason.CONCURRENT_LIMIT_REACHED]: [WatchFallbackAction.RELEASE_A_SCREEN],
  [WatchDenialReason.OUT_OF_TERRITORY]: [WatchFallbackAction.SEE_OTHER_DATES],
  [WatchDenialReason.DATE_CANCELLED]: [WatchFallbackAction.SEE_OTHER_DATES],
  [WatchDenialReason.REPLAY_EXPIRED]: [WatchFallbackAction.SEE_OTHER_DATES],
  [WatchDenialReason.NO_REPLAY]: [WatchFallbackAction.SEE_REPLAY_POLICY],
  [WatchDenialReason.REPLAY_NOT_ON_SALE]: [WatchFallbackAction.SEE_REPLAY_POLICY],
  [WatchDenialReason.NOT_PUBLISHED]: [WatchFallbackAction.NONE],
  [WatchDenialReason.SEAT_EXPIRED]: [
    WatchFallbackAction.BUY_SEAT,
    WatchFallbackAction.JOIN_WAITLIST,
    WatchFallbackAction.NONE,
    WatchFallbackAction.SEE_OTHER_DATES,
  ],
  [WatchDenialReason.DATE_INTERRUPTED]: [WatchFallbackAction.SEE_OTHER_DATES],
  [WatchDenialReason.LIVE_ENDED]: [
    WatchFallbackAction.SEE_REPLAY_POLICY,
    WatchFallbackAction.SEE_OTHER_DATES,
  ],
};

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

export function seatStandingOf(facts: SeatStandingFacts): SeatStanding {
  return {
    onPublicSale: facts.publicSeatsAvailable > 0,
    priorityPoolOpen:
      facts.notifiedUntil !== null &&
      isBefore(facts.now, facts.notifiedUntil) &&
      facts.priorityPoolSeats > 0,
    onWaitlist: facts.onWaitlist,
  };
}

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

const VERDICT_MAX_VALIDITY_MS = 60_000;

function denied(
  reason: WatchDenialReason,
  fallback: WatchFallbackAction,
  previewSecondsLeft: number,
  validUntil: Instant,
): WatchVerdict {
  return {
    allowed: false,
    scope: WatchScope.NONE,
    reason,
    fallback,
    previewSecondsLeft,
    validUntil,
  };
}

function allowed(
  scope: WatchScope,
  fallback: WatchFallbackAction,
  previewSecondsLeft: number,
  validUntil: Instant,
): WatchVerdict {
  return { allowed: true, scope, reason: null, fallback, previewSecondsLeft, validUntil };
}

/**
 * The watch verdict on a live. The order of the refusals is a decision: most definitive first, so
 * the message shown is the most useful one — telling someone with no seat "out of territory" is
 * truer than "no seat", since buying a seat would not unblock them (`storefront-web` Q19).
 */
export function decideWatch(input: WatchInput): WatchVerdict {
  const horizon = shortHorizon(input.now);
  const preview = Math.max(0, input.previewSecondsLeft);

  if (!isAvailableIn(input.rights, input.viewerCountry)) {
    return denied(
      WatchDenialReason.OUT_OF_TERRITORY,
      WatchFallbackAction.SEE_OTHER_DATES,
      preview,
      horizon,
    );
  }
  if (input.outcome === DateOutcome.CANCELLED) {
    return denied(
      WatchDenialReason.DATE_CANCELLED,
      WatchFallbackAction.SEE_OTHER_DATES,
      preview,
      horizon,
    );
  }
  if (input.outcome === DateOutcome.INTERRUPTED) {
    return denied(
      WatchDenialReason.DATE_INTERRUPTED,
      WatchFallbackAction.SEE_OTHER_DATES,
      preview,
      horizon,
    );
  }

  // D-072: a published date under technical check stays public, so it is read on the time axis.
  const display = publicDisplayStateOf({
    publicationState: input.publicationState,
    runState: input.runState,
    outcome: input.outcome,
    timing: input.timing,
    now: input.now,
  });

  if (display.state === DisplayState.DRAFT || display.state === DisplayState.RESERVE) {
    return denied(WatchDenialReason.NOT_PUBLISHED, WatchFallbackAction.NONE, preview, horizon);
  }
  if (input.concurrentStreamsOpen >= input.concurrentStreamsAllowed) {
    return denied(
      WatchDenialReason.CONCURRENT_LIMIT_REACHED,
      WatchFallbackAction.RELEASE_A_SCREEN,
      preview,
      horizon,
    );
  }

  const validUntil = earliest(horizon, display.validUntil ?? horizon);

  if (
    input.runState === RunState.ENDED ||
    display.state === DisplayState.REPLAY ||
    display.state === DisplayState.ENDED
  ) {
    return denied(
      WatchDenialReason.LIVE_ENDED,
      input.timing.replayPolicy === ReplayPolicy.NONE
        ? WatchFallbackAction.SEE_OTHER_DATES
        : WatchFallbackAction.SEE_REPLAY_POLICY,
      preview,
      validUntil,
    );
  }
  if (display.state === DisplayState.SCHEDULED || display.state === DisplayState.POSTPONED) {
    return denied(
      WatchDenialReason.ROOM_NOT_OPEN,
      input.holdsSeat ? WatchFallbackAction.NONE : seatAction(input),
      preview,
      validUntil,
    );
  }

  const opensTheLive = input.holdsSeat || input.planOpenings.includes(PlanOpening.ALL_LIVES);
  if (opensTheLive) {
    // In the room before on air, the player shows its waiting screen (D-109).
    return allowed(WatchScope.FULL, WatchFallbackAction.NONE, preview, validUntil);
  }
  if (input.seatExpired) {
    return denied(WatchDenialReason.SEAT_EXPIRED, seatAction(input), preview, validUntil);
  }
  // D-110: no preview before on air; a late start keeps the room open.
  if (display.state !== DisplayState.LIVE) {
    return denied(WatchDenialReason.NO_SEAT, seatAction(input), preview, validUntil);
  }
  if (preview > 0) {
    return allowed(WatchScope.PREVIEW, seatAction(input), preview, validUntil);
  }
  return denied(WatchDenialReason.PREVIEW_EXHAUSTED, seatAction(input), preview, validUntil);
}

// Offering `buy_seat` on a sold-out date is a button that leads nowhere, the dead end principle
// no. 8 forbids; past D-089's cutoff neither a seat nor a place on the list can be had for this
// live, and the way out is another date.
function seatAction(input: WatchInput): WatchFallbackAction {
  if (salesEndedBy(seatSalesEndAt(input.timing.startsAt), input.now)) {
    return WatchFallbackAction.SEE_OTHER_DATES;
  }
  const standing = input.seatStanding;
  if (standing === null) return WatchFallbackAction.JOIN_WAITLIST;
  if (standing.onPublicSale || standing.priorityPoolOpen) return WatchFallbackAction.BUY_SEAT;
  return standing.onWaitlist ? WatchFallbackAction.NONE : WatchFallbackAction.JOIN_WAITLIST;
}

function shortHorizon(now: Instant): Instant {
  return new Date(Date.parse(now) + VERDICT_MAX_VALIDITY_MS).toISOString();
}

/**
 * The concurrent-screen ceiling on a date: the active seats held on it, or the plan's ceiling if
 * higher (D-108). `streaming` enforces it with a lease that expires.
 */
export function concurrentStreamsAllowedFor(
  planOpenings: readonly PlanOpening[],
  activeSeatsOnDate: number,
): number {
  const planCeiling = planOpenings.includes(PlanOpening.MULTI_SCREEN) ? 2 : 1;
  return Math.max(planCeiling, activeSeatsOnDate);
}

/** A subscription as `ticketing` records it: its state, what its plan opens, and how far it is paid. */
export interface SubscriptionOpenings {
  readonly state: SubscriptionState;
  readonly opens: readonly PlanOpening[];
  /**
   * The end of the last PAID period, `null` when none was paid. Never the provider's current
   * period end: a renewal moves that forward before it is paid, so a final payment failure would
   * open the unpaid period.
   */
  readonly paidThrough: Instant | null;
}

// D-125: a payment being retried keeps the access; its final failure arrives as `cancelled`, and
// opens nothing past what was paid.
const OPENS_WHILE: Readonly<
  Record<SubscriptionState, (paidThrough: Instant | null, now: Instant) => boolean>
> = {
  [SubscriptionState.ACTIVE]: () => true,
  [SubscriptionState.TRIALING]: () => true,
  [SubscriptionState.PAST_DUE]: () => true,
  [SubscriptionState.CANCELLED]: (paidThrough, now) =>
    paidThrough !== null && isBefore(now, paidThrough),
};

/** What a subscription opens now. Every caller passes this, never `opens`, to `decideWatch` and `concurrentStreamsAllowedFor`. */
export function planOpeningsOf(
  subscription: SubscriptionOpenings,
  now: Instant,
): readonly PlanOpening[] {
  return OPENS_WHILE[subscription.state](subscription.paidThrough, now) ? subscription.opens : [];
}

/**
 * The free-preview budget, counted down by the server, per account.
 *
 * `storefront-web` Q20: a preview you extend by reloading the page is not a preview, and
 * `storefront-mobile` Q6 adds that a reinstall resets a client-side counter. Per account rather
 * than per device, or a household with four devices gets four previews.
 */
export const PREVIEW_BUDGET_SECONDS = 300;

export function previewSecondsLeft(secondsUsed: number): number {
  return Math.max(0, PREVIEW_BUDGET_SECONDS - Math.max(0, secondsUsed));
}
