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
import { displayStateOf } from '../catalog/date-state.js';
import { isAvailableIn, type TerritoryRights } from '../catalog/rights.js';
import type { Instant } from '../kernel/clock.js';
import { earliest } from '../time/instant.js';
import { DateOutcome, DisplayState, ReplayPolicy } from '../vocabulary/catalog.js';
import type { PublicationState, RunState } from '../vocabulary/catalog.js';
import { PlanOpening } from '../vocabulary/commerce.js';
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
 * This table is the function's RANGE, not a menu of what a screen might offer: an action
 * belongs on a row if `decideWatch` can return it for that reason. Hence `PREVIEW_EXHAUSTED`
 * carries `join_waitlist` and not `subscribe` — subscribing is a real way out of a spent
 * preview, but the function never returns it there, and a table listing what the function
 * cannot produce stops being checkable against the function.
 *
 * The keys are computed, and were bare literals until the values became translation keys: the
 * day `NO_SEAT` became `watch.no_seat`, all eleven were wrong at once and `tsc` caught all
 * eleven. That is what the `Record` keyed by the union is for.
 */
export const WATCH_FALLBACK_FOR: Readonly<
  Record<WatchDenialReason, readonly WatchFallbackAction[]>
> = {
  [WatchDenialReason.NO_SEAT]: [WatchFallbackAction.BUY_SEAT, WatchFallbackAction.JOIN_WAITLIST],
  [WatchDenialReason.PREVIEW_EXHAUSTED]: [
    WatchFallbackAction.BUY_SEAT,
    WatchFallbackAction.JOIN_WAITLIST,
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
};

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

/**
 * The watch verdict. The order of the refusals is a decision: most definitive first, so the
 * message shown is the most useful one — telling someone with no seat "out of territory" is
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

  const display = displayStateOf({
    publicationState: input.publicationState,
    runState: input.runState,
    outcome: input.outcome,
    timing: input.timing,
    now: input.now,
  });

  if (
    display.state === DisplayState.DRAFT ||
    display.state === DisplayState.RESERVE ||
    display.state === DisplayState.TECHNICAL
  ) {
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

  if (display.state === DisplayState.REPLAY) {
    return decideReplay(input, preview, validUntil);
  }

  if (display.state === DisplayState.LIVE || display.state === DisplayState.ROOM_OPEN) {
    if (input.holdsSeat) {
      return {
        allowed: true,
        scope: WatchScope.FULL,
        reason: null,
        fallback: WatchFallbackAction.NONE,
        previewSecondsLeft: preview,
        validUntil,
      };
    }
    if (input.planOpenings.includes(PlanOpening.ALL_LIVES)) {
      return {
        allowed: true,
        scope: WatchScope.FULL,
        reason: null,
        fallback: WatchFallbackAction.NONE,
        previewSecondsLeft: preview,
        validUntil,
      };
    }
    if (preview > 0) {
      return {
        allowed: true,
        scope: WatchScope.PREVIEW,
        reason: null,
        fallback: WatchFallbackAction.BUY_SEAT,
        previewSecondsLeft: preview,
        validUntil,
      };
    }
    return denied(WatchDenialReason.PREVIEW_EXHAUSTED, seatAction(input), preview, validUntil);
  }

  if (display.state === DisplayState.SCHEDULED) {
    return denied(
      WatchDenialReason.ROOM_NOT_OPEN,
      input.holdsSeat ? WatchFallbackAction.NONE : seatAction(input),
      preview,
      validUntil,
    );
  }

  return denied(
    input.timing.replayPolicy === ReplayPolicy.NONE
      ? WatchDenialReason.NO_REPLAY
      : WatchDenialReason.REPLAY_EXPIRED,
    input.timing.replayPolicy === ReplayPolicy.NONE
      ? WatchFallbackAction.SEE_REPLAY_POLICY
      : WatchFallbackAction.SEE_OTHER_DATES,
    preview,
    validUntil,
  );
}

function decideReplay(input: WatchInput, preview: number, validUntil: Instant): WatchVerdict {
  const allow = (): WatchVerdict => ({
    allowed: true,
    scope: WatchScope.FULL,
    reason: null,
    fallback: WatchFallbackAction.NONE,
    previewSecondsLeft: preview,
    validUntil,
  });

  switch (input.timing.replayPolicy) {
    case ReplayPolicy.INCLUDED:
      return input.holdsSeat
        ? allow()
        : denied(WatchDenialReason.NO_SEAT, seatAction(input), preview, validUntil);
    case ReplayPolicy.SUBSCRIPTION:
      return input.planOpenings.includes(PlanOpening.REPLAYS)
        ? allow()
        : denied(
            WatchDenialReason.SUBSCRIPTION_REQUIRED,
            WatchFallbackAction.SUBSCRIBE,
            preview,
            validUntil,
          );
    case ReplayPolicy.UNIT:
      if (input.holdsSeat) return allow();
      return input.replayOnSale
        ? denied(WatchDenialReason.NO_SEAT, seatAction(input), preview, validUntil)
        : denied(
            WatchDenialReason.REPLAY_NOT_ON_SALE,
            WatchFallbackAction.SEE_REPLAY_POLICY,
            preview,
            validUntil,
          );
    case ReplayPolicy.NONE:
      return denied(
        WatchDenialReason.NO_REPLAY,
        WatchFallbackAction.SEE_REPLAY_POLICY,
        preview,
        validUntil,
      );
  }
}

// Offering `buy_seat` on a sold-out date is a button that leads nowhere, the dead end
// principle no. 8 forbids.
function seatAction(input: WatchInput): WatchFallbackAction {
  return input.waitlistOpen ? WatchFallbackAction.JOIN_WAITLIST : WatchFallbackAction.BUY_SEAT;
}

function shortHorizon(now: Instant): Instant {
  return new Date(Date.parse(now) + VERDICT_MAX_VALIDITY_MS).toISOString();
}

/**
 * The concurrent-screen ceiling, derived from the plan. `multi-screen` is an execution
 * constraint that forces a server-side count: `ticketing` publishes the ceiling, `streaming`
 * enforces it with a lease that expires.
 */
export function concurrentStreamsAllowedFor(planOpenings: readonly PlanOpening[]): number {
  return planOpenings.includes(PlanOpening.MULTI_SCREEN) ? 2 : 1;
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
