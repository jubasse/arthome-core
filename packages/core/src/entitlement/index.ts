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
import { displayStateOf } from '../catalog/date-state.js';
import { isAvailableIn, type TerritoryRights } from '../catalog/rights.js';
import type { Instant } from '../kernel/clock.js';
import { earliest } from '../time/instant.js';
import { DateOutcome, DisplayState, ReplayPolicy } from '../vocabulary/catalog.js';
import type { PublicationState, RunState } from '../vocabulary/catalog.js';
import { PlanOpening } from '../vocabulary/commerce.js';
import { WatchDenialReason, WatchFallbackAction, WatchScope } from '../vocabulary/entitlement.js';

// Both names carry their TWO meanings — the union type and the named-member
// object — so one re-export statement carries both. Splitting a `export type`
// off would shadow the value half, which is TS1362 waiting to happen.
export {
  WATCH_DENIAL_REASONS,
  WATCH_FALLBACK_ACTIONS,
  WATCH_SCOPES,
  WatchDenialReason,
  WatchFallbackAction,
  WatchScope,
} from '../vocabulary/entitlement.js';

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
/**
 * ⚠ THE KEYS ARE COMPUTED, and they were bare literals until the values became
 *   translation keys.
 *
 *   `NO_SEAT: [...]` was a literal that happened to equal the vocabulary's
 *   value. The day the value changed — to `watch.no_seat`, so that a served code
 *   IS its own i18n key — every one of these eleven keys became wrong at once.
 *   `tsc` caught all eleven, which is exactly what the `Record` keyed by the
 *   union is for, and it is the reason this table was written that way rather
 *   than as an array.
 *
 *   `[WatchDenialReason.NO_SEAT]` cannot drift: there is no second copy of the
 *   string to keep in step, only the name.
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
 * The order of the refusals is a DECISION, not a convenience.
 *
 * It runs from the most definitive to the most recoverable, so that the message
 * shown is the most useful one: telling someone with no seat "out of territory"
 * is truer than "no seat", since buying a seat would not unblock them.
 * `storefront-web` Q19 asked for this without putting it that way — it was the
 * truth-table test that brought it out.
 */
export function decideWatch(input: WatchInput): WatchVerdict {
  const horizon = shortHorizon(input.now);
  const preview = Math.max(0, input.previewSecondsLeft);

  // 1. Territory — definitive, and it cannot be bought.
  if (!isAvailableIn(input.rights, input.viewerCountry)) {
    return denied(
      WatchDenialReason.OUT_OF_TERRITORY,
      WatchFallbackAction.SEE_OTHER_DATES,
      preview,
      horizon,
    );
  }

  // 2. The outcome — a cancelled date cannot be watched, even with a seat.
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

  // 3. What is not public cannot be watched.
  if (
    display.state === DisplayState.DRAFT ||
    display.state === DisplayState.RESERVE ||
    display.state === DisplayState.TECHNICAL
  ) {
    return denied(WatchDenialReason.NOT_PUBLISHED, WatchFallbackAction.NONE, preview, horizon);
  }

  // 4. The screen limit — recoverable by releasing a screen, hence the fallback
  //    action. A bare refusal would leave the viewer with no way out.
  if (input.concurrentStreamsOpen >= input.concurrentStreamsAllowed) {
    return denied(
      WatchDenialReason.CONCURRENT_LIMIT_REACHED,
      WatchFallbackAction.RELEASE_A_SCREEN,
      preview,
      horizon,
    );
  }

  const validUntil = earliest(horizon, display.validUntil ?? horizon);

  // 5. The replay — three distinct refusals, which the TV insists on telling apart.
  if (display.state === DisplayState.REPLAY) {
    return decideReplay(input, preview, validUntil);
  }

  // 6. Live — holding a seat opens the show (principle no. 3).
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
    // The free preview: bounded, counted down by the SERVER, and never renewed
    // by reloading the page.
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

  // 7. Before the room opens, a seat is not yet enough.
  if (display.state === DisplayState.SCHEDULED) {
    return denied(
      WatchDenialReason.ROOM_NOT_OPEN,
      input.holdsSeat ? WatchFallbackAction.NONE : seatAction(input),
      preview,
      validUntil,
    );
  }

  // 8. Over, with no replay online.
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
      // Included: holding a seat opens it. Without a seat, it must be bought.
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

/**
 * The way out of "you have no seat": buy one, or join the list when the date is
 * sold out. Offering `buy_seat` on a sold-out date is a button that leads
 * nowhere, which is the dead end principle no. 8 forbids.
 */
function seatAction(input: WatchInput): WatchFallbackAction {
  return input.waitlistOpen ? WatchFallbackAction.JOIN_WAITLIST : WatchFallbackAction.BUY_SEAT;
}

function shortHorizon(now: Instant): Instant {
  return new Date(Date.parse(now) + VERDICT_MAX_VALIDITY_MS).toISOString();
}

/**
 * The concurrent-screen ceiling, derived from the plan.
 *
 * `multi-screen` is not a marketing line: it is an EXECUTION CONSTRAINT that
 * forces a server-side count. `ticketing` publishes the ceiling; `streaming`
 * enforces it with a lease that expires.
 */
export function concurrentStreamsAllowedFor(planOpenings: readonly PlanOpening[]): number {
  return planOpenings.includes(PlanOpening.MULTI_SCREEN) ? 2 : 1;
}

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
export const PREVIEW_BUDGET_SECONDS = 300;

export function previewSecondsLeft(secondsUsed: number): number {
  return Math.max(0, PREVIEW_BUDGET_SECONDS - Math.max(0, secondsUsed));
}
