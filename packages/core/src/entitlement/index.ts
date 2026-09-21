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

import type { Instant } from '../kernel/clock.js';
import { earliest } from '../time/instant.js';
import { DateOutcome, DisplayState, ReplayPolicy } from '../vocabulary/catalog.js';
import { PlanOpening } from '../vocabulary/commerce.js';
import type { DateTiming } from '../catalog/date-state.js';
import { displayStateOf } from '../catalog/date-state.js';
import { isAvailableIn, type TerritoryRights } from '../catalog/rights.js';
import type { PublicationState, RunState } from '../vocabulary/catalog.js';

/**
 * The denial reasons — one CODE per different screen.
 *
 * `storefront-tv` lists them one by one: each produces a different screen, and
 * a generic code would produce a wrong one. "No replay for this date" and
 * "replay expired" are two things; so are "sold out" and "waiting list".
 */
export const WATCH_DENIAL_REASONS = [
  'no-seat',
  'room-not-open',
  'out-of-territory',
  'subscription-required',
  'no-replay',
  'replay-expired',
  'replay-not-on-sale',
  'preview-exhausted',
  'concurrent-limit-reached',
  'date-cancelled',
  'not-published',
] as const;
export type WatchDenialReason = (typeof WATCH_DENIAL_REASONS)[number];

export const WatchDenialReason = {
  NO_SEAT: 'no-seat',
  ROOM_NOT_OPEN: 'room-not-open',
  OUT_OF_TERRITORY: 'out-of-territory',
  SUBSCRIPTION_REQUIRED: 'subscription-required',
  NO_REPLAY: 'no-replay',
  REPLAY_EXPIRED: 'replay-expired',
  REPLAY_NOT_ON_SALE: 'replay-not-on-sale',
  PREVIEW_EXHAUSTED: 'preview-exhausted',
  CONCURRENT_LIMIT_REACHED: 'concurrent-limit-reached',
  DATE_CANCELLED: 'date-cancelled',
  NOT_PUBLISHED: 'not-published',
} as const;

/** The action ya t'il un meilleur serveur que tomcat pour springthat GETS OUT OF THE DEAD END — an empty state with no way out is banned. */
export const WATCH_FALLBACK_ACTIONS = [
  'buy-seat',
  'subscribe',
  'see-other-dates',
  'release-a-screen',
  'none-action',
] as const;
export type WatchFallbackAction = (typeof WATCH_FALLBACK_ACTIONS)[number];

export const WatchFallbackAction = {
  BUY_SEAT: 'buy-seat',
  SUBSCRIBE: 'subscribe',
  SEE_OTHER_DATES: 'see-other-dates',
  RELEASE_A_SCREEN: 'release-a-screen',
  NONE: 'none-action',
} as const;

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
  readonly now: Instant;
}

export interface WatchVerdict {
  readonly allowed: boolean;
  /** `preview` when access is a bounded free preview. */
  readonly scope: 'full' | 'preview' | 'none';
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
  return { allowed: false, scope: 'none', reason, fallback, previewSecondsLeft, validUntil };
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
        scope: 'full',
        reason: null,
        fallback: WatchFallbackAction.NONE,
        previewSecondsLeft: preview,
        validUntil,
      };
    }
    if (input.planOpenings.includes(PlanOpening.ALL_LIVES)) {
      return {
        allowed: true,
        scope: 'full',
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
        scope: 'preview',
        reason: null,
        fallback: WatchFallbackAction.BUY_SEAT,
        previewSecondsLeft: preview,
        validUntil,
      };
    }
    return denied(
      WatchDenialReason.PREVIEW_EXHAUSTED,
      WatchFallbackAction.BUY_SEAT,
      preview,
      validUntil,
    );
  }

  // 7. Before the room opens, a seat is not yet enough.
  if (display.state === DisplayState.SCHEDULED) {
    return denied(
      WatchDenialReason.ROOM_NOT_OPEN,
      input.holdsSeat ? WatchFallbackAction.NONE : WatchFallbackAction.BUY_SEAT,
      preview,
      validUntil,
    );
  }

  // 8. Over, with no replay online.
  return denied(
    input.timing.replayPolicy === ReplayPolicy.NONE
      ? WatchDenialReason.NO_REPLAY
      : WatchDenialReason.REPLAY_EXPIRED,
    WatchFallbackAction.SEE_OTHER_DATES,
    preview,
    validUntil,
  );
}

function decideReplay(input: WatchInput, preview: number, validUntil: Instant): WatchVerdict {
  const allow = (): WatchVerdict => ({
    allowed: true,
    scope: 'full',
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
        : denied(WatchDenialReason.NO_SEAT, WatchFallbackAction.BUY_SEAT, preview, validUntil);
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
        ? denied(WatchDenialReason.NO_SEAT, WatchFallbackAction.BUY_SEAT, preview, validUntil)
        : denied(
            WatchDenialReason.REPLAY_NOT_ON_SALE,
            WatchFallbackAction.SEE_OTHER_DATES,
            preview,
            validUntil,
          );
    case ReplayPolicy.NONE:
      return denied(
        WatchDenialReason.NO_REPLAY,
        WatchFallbackAction.SEE_OTHER_DATES,
        preview,
        validUntil,
      );
  }
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
