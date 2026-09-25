/**
 * Moderation: three separate axes, two counters, a written precedence.
 *
 * D6 / E3 — four vocabularies for one notion, and the fault was not that they diverged: it was
 * that `reported`, a TRIAGE state, sat in the SANCTIONS field, so the queue was built by
 * filtering `state === 'reported'` — a kind filter wearing the shape of a state filter.
 */

import type { Instant } from '../kernel/clock.js';
import { DomainError } from '../kernel/errors.js';
import { isAfter, plusMinutes } from '../time/instant.js';
import { ModerationErrorCode } from '../vocabulary/error-codes.js';
import type { ModerationVerdict } from '../vocabulary/moderation.js';
import {
  AudienceSanction,
  MessageState,
  ModerationItemState,
  StateChangeOrigin,
} from '../vocabulary/moderation.js';

/**
 * The single badge, derived from the three axes and never recomposed by a surface. Only one
 * appears on screen, so there is one owner of the truth:
 *
 *   banned  >  muted  >  removed  >  published
 *
 * It runs from the person towards the message: a sanction on the PERSON covers all their
 * messages, a removal bears on one message only.
 *
 * ⚠ This order is load-bearing and no gate protects it: `check-vocabulary` compares member
 * SETS, so it read the documents' reversed `published, removed, muted, banned` as agreeing.
 * Reordering to match a document makes a banned person's message show `removed`.
 */
export const MODERATION_BADGES = ['banned', 'muted', 'removed', 'published'] as const;
export type ModerationBadge = (typeof MODERATION_BADGES)[number];

export const ModerationBadge = {
  BANNED: 'banned',
  MUTED: 'muted',
  REMOVED: 'removed',
  PUBLISHED: 'published',
} as const;

export function moderationBadgeOf(
  messageState: MessageState,
  authorSanction: AudienceSanction,
): ModerationBadge {
  if (authorSanction === AudienceSanction.BANNED) return ModerationBadge.BANNED;
  if (authorSanction === AudienceSanction.MUTED) return ModerationBadge.MUTED;
  if (messageState === MessageState.REMOVED) return ModerationBadge.REMOVED;
  return ModerationBadge.PUBLISHED;
}

/** The claim lease. Claiming is not settling: without an expiry a closed browser freezes a row
 * for the whole live show. */
export const CLAIM_LEASE_MINUTES = 3;

export function claimExpiryFrom(claimedAt: Instant): Instant {
  return plusMinutes(claimedAt, CLAIM_LEASE_MINUTES);
}

export function isClaimExpired(claimExpiresAt: Instant, now: Instant): boolean {
  return !isAfter(claimExpiresAt, now);
}

/**
 * A moderation row as a verdict command read it.
 *
 * ⚠ Two counters, and `studio-mobile` C3 had one. On the contract's own examples `claim` then
 * `release`, settling nothing, moves the version from 1 to 3 — so a moderator who read the
 * queue at `version: 1`, lost the network and settled saw their verdict refused, with the
 * offline queue the one concession granted to mobile. The rule underneath is a supersession:
 * as long as a colleague has returned no verdict, your sanction applies, which one counter
 * cannot express. So `version` carries the lease, `decisionVersion` carries the settlement,
 * only a verdict increments it, and a verdict command is conditioned on the second.
 */
export interface ModerationItemSnapshot {
  readonly state: ModerationItemState;
  /** Incremented by any change, lease included. */
  readonly version: number;
  /** Incremented by a VERDICT only. */
  readonly decisionVersion: number;
  readonly settledBy: string | null;
  readonly verdict: ModerationVerdict | null;
}

export interface SettlementAttempt {
  readonly expectedDecisionVersion: number;
  readonly verdict: ModerationVerdict;
  readonly origin: StateChangeOrigin;
}

export type SettlementOutcome =
  | { readonly accepted: true }
  | {
      readonly accepted: false;
      readonly code: string;
      /** The WINNING verdict and its author, so the screen tells the truth. */
      readonly winner: { readonly verdict: ModerationVerdict; readonly settledBy: string } | null;
    };

/**
 * Is a verdict admissible?
 *
 * A row merely CLAIMED by a colleague is accepted — that is the supersession. A settled one is
 * refused with the winning verdict and its author, so the screen shows "X has already deleted
 * this message" rather than costing a second round trip mid-show.
 */
export function evaluateSettlement(
  snapshot: ModerationItemSnapshot,
  attempt: SettlementAttempt,
): SettlementOutcome {
  if (snapshot.state === ModerationItemState.SETTLED) {
    return {
      accepted: false,
      code: ModerationErrorCode.ALREADY_SETTLED,
      winner:
        snapshot.verdict !== null && snapshot.settledBy !== null
          ? { verdict: snapshot.verdict, settledBy: snapshot.settledBy }
          : null,
    };
  }
  if (attempt.expectedDecisionVersion !== snapshot.decisionVersion) {
    return {
      accepted: false,
      code: ModerationErrorCode.DECISION_VERSION_STALE,
      winner: null,
    };
  }
  return { accepted: true };
}

/**
 * The human / automatic precedence, in one direction only: a human overturns an automatic
 * decision, never the reverse. Otherwise a retroactive filter erases a judgement already made —
 * and human judgement is what is kept for 24 months and journalled by name.
 */
export function canOverride(
  existingOrigin: StateChangeOrigin,
  incomingOrigin: StateChangeOrigin,
): boolean {
  const existingIsHuman = existingOrigin === StateChangeOrigin.HUMAN_VERDICT;
  const incomingIsHuman = incomingOrigin === StateChangeOrigin.HUMAN_VERDICT;
  if (existingIsHuman && !incomingIsHuman) return false;
  return true;
}

export function assertCanOverride(
  existingOrigin: StateChangeOrigin,
  incomingOrigin: StateChangeOrigin,
): void {
  if (!canOverride(existingOrigin, incomingOrigin)) {
    throw new DomainError({
      code: ModerationErrorCode.AUTOMATIC_CANNOT_OVERRIDE_HUMAN,
      params: { existing: existingOrigin, incoming: incomingOrigin },
    });
  }
}

/**
 * The chat's rate window, in a declared unit. `studio-mobile` inconsistency 6: the mockup
 * computed `messages / hours elapsed`, labelled it "MSG/MIN" and compared it against 60
 * msg/min — not the same quantity, so the contract fixes window, unit and frequency.
 */
export const CHAT_RATE_WINDOW_SECONDS = 60;
export const CHAT_BURST_THRESHOLD_PER_MINUTE = 60;

export function chatRatePerMinute(messagesInWindow: number): number {
  return Math.round((messagesInWindow / CHAT_RATE_WINDOW_SECONDS) * 60);
}

/** Past the threshold, the console stops showing the chat message by message. */
export function shouldCollapseToQueue(messagesInWindow: number): boolean {
  return chatRatePerMinute(messagesInWindow) >= CHAT_BURST_THRESHOLD_PER_MINUTE;
}

/** A sanction carries an EXPIRY INSTANT, never a label. */
export function sanctionExpiryFrom(
  sanctionedAt: Instant,
  durationMinutes: number | null,
): Instant | null {
  return durationMinutes === null ? null : plusMinutes(sanctionedAt, durationMinutes);
}

export function isSanctionActive(expiresAt: Instant | null, now: Instant): boolean {
  return expiresAt === null || isAfter(expiresAt, now);
}
