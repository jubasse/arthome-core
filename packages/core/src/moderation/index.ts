/**
 * Moderation: THREE separate AXES, TWO COUNTERS, a written precedence.
 *
 * D6 / E3 — four vocabularies coexisted for one notion, and the underlying
 * fault was not that they diverged: it was that `reported`, a TRIAGE state,
 * sat in the SANCTIONS field. That is why the queue was built by filtering
 * `state === 'reported'`, which is not a state filter but a kind filter.
 */

import type { Instant } from '../kernel/clock.js';
import { DomainError } from '../kernel/errors.js';
import { isAfter, plusMinutes } from '../time/instant.js';
import { DomainErrorCode, ModerationErrorCode } from '../vocabulary/error-codes.js';
import type { ModerationVerdict } from '../vocabulary/moderation.js';
import {
  AudienceSanction,
  MessageState,
  ModerationItemState,
  StateChangeOrigin,
} from '../vocabulary/moderation.js';

/**
 * THE SINGLE BADGE — derived from the three axes, never recomposed by a
 * surface.
 *
 * ⚠ The members are BARE — `banned`, not `badge_banned` — and they deliberately
 * collide with `AUDIENCE_SANCTIONS` and `MESSAGE_STATES`. The field is named
 * `badge` on the wire, so a `badge_` prefix says "badge" twice; the field name
 * disambiguates, not the value. I kept the prefix once on the argument that a
 * badge is a DERIVED fact and `badge_banned` is not the sanction `banned` —
 * which is true about the concepts and irrelevant to the wire, because nothing
 * reads a value without reading the field it arrived in.
 *
 * Only one badge appears on screen, so there can be only one owner of the
 * truth. The precedence, written once:
 *
 *   banned  >  muted  >  removed  >  published
 *
 * It runs from the person towards the message: a sanction on the PERSON covers
 * all their messages, whereas a removal bears on one message only.
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

/**
 * THE CLAIM LEASE — short, and it EXPIRES.
 *
 * "Claiming is not settling." Without an expiry, a moderator who closes their
 * browser freezes a row for the whole live show.
 */
export const CLAIM_LEASE_MINUTES = 3;

export function claimExpiryFrom(claimedAt: Instant): Instant {
  return plusMinutes(claimedAt, CLAIM_LEASE_MINUTES);
}

export function isClaimExpired(claimExpiresAt: Instant, now: Instant): boolean {
  return !isAfter(claimExpiresAt, now);
}

/**
 * THE TWO COUNTERS — and this is the correction to `studio-mobile`'s C3.
 *
 * Demonstrated on the contract's own examples: `claim` then `release`, WITHOUT
 * SETTLING ANYTHING, moves the version from 1 to 3. A moderator who reads the
 * queue at `version: 1`, loses the network and settles therefore sees their
 * verdict REFUSED on reconnection — when the offline queue is the one
 * concession granted to mobile, and on a live show at 60 messages a minute the
 * rows change lease constantly.
 *
 * The substance is graver than a misplaced counter: the real rule is a
 * SUPERSESSION — "as long as your colleague has returned no verdict, your
 * sanction applies". A verdict must therefore be ACCEPTED while someone else
 * holds the lease.
 *
 *   ⚠ A single counter cannot express
 *     "refuse if settled, accept if merely claimed".
 *
 * Hence: `version` carries the LEASE, `decisionVersion` carries the
 * SETTLEMENT, and ONLY a verdict increments it. A verdict command is
 * conditioned on the second, never on the first.
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
 * Three answers, and the second is the one missing everywhere:
 *   - the row is already SETTLED  -> refusal, WITH the winning verdict and its
 *     author, so the screen can show "X has already deleted this message"
 *     instead of a bare failure. A bare refusal would force a second round trip
 *     in the middle of a live show;
 *   - the row is merely CLAIMED by a colleague -> ACCEPTED. That is the
 *     supersession, and it is what a single counter refused;
 *   - the settlement has moved on since the read -> refusal.
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
      code: DomainErrorCode.MODERATION_DECISION_VERSION_STALE,
      winner: null,
    };
  }
  return { accepted: true };
}

/**
 * THE HUMAN / AUTOMATIC PRECEDENCE, written in ONE DIRECTION ONLY.
 *
 * A human overturns an automatic decision; **never the reverse**. Without this
 * rule, a retroactive filter would erase a judgement already made — and human
 * judgement is precisely what we keep for 24 months and journal by name.
 *
 * Automatic moderation is not built today. This function exists so the shape
 * can accommodate it without a contract change: cheap now, expensive later.
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
      code: DomainErrorCode.MODERATION_AUTOMATIC_CANNOT_OVERRIDE_HUMAN,
      params: { existing: existingOrigin, incoming: incomingOrigin },
    });
  }
}

/**
 * The chat's RATE, measured in a DECLARED unit.
 *
 * `studio-mobile` (inconsistency 6): the mockup computes `messages / hours
 * elapsed`, labels it "MSG/MIN", then compares it against a threshold of
 * 60 msg/min. Those are not the same quantities. So the contract fixes the
 * window, the unit and the frequency.
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
