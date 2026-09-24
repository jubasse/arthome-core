/**
 * Moderation: THREE separate AXES, TWO COUNTERS, a written precedence.
 *
 * D6 / E3 — four vocabularies coexisted for one notion, and the underlying
 * fault was not that they diverged: it was that `reported`, a TRIAGE state,
 * sat in the SANCTIONS field. That is why the queue was built by filtering
 * `state === 'reported'`, which is not a state filter but a kind filter.
 */
import { DomainError } from '../kernel/errors.js';
import { isAfter, plusMinutes } from '../time/instant.js';
import { AudienceSanction, MessageState, ModerationItemState, StateChangeOrigin, } from '../vocabulary/moderation.js';
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
export const MODERATION_BADGES = ['banned', 'muted', 'removed', 'published'];
export const ModerationBadge = {
    BANNED: 'banned',
    MUTED: 'muted',
    REMOVED: 'removed',
    PUBLISHED: 'published',
};
export function moderationBadgeOf(messageState, authorSanction) {
    if (authorSanction === AudienceSanction.BANNED)
        return ModerationBadge.BANNED;
    if (authorSanction === AudienceSanction.MUTED)
        return ModerationBadge.MUTED;
    if (messageState === MessageState.REMOVED)
        return ModerationBadge.REMOVED;
    return ModerationBadge.PUBLISHED;
}
/**
 * THE CLAIM LEASE — short, and it EXPIRES.
 *
 * "Claiming is not settling." Without an expiry, a moderator who closes their
 * browser freezes a row for the whole live show.
 */
export const CLAIM_LEASE_MINUTES = 3;
export function claimExpiryFrom(claimedAt) {
    return plusMinutes(claimedAt, CLAIM_LEASE_MINUTES);
}
export function isClaimExpired(claimExpiresAt, now) {
    return !isAfter(claimExpiresAt, now);
}
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
export function evaluateSettlement(snapshot, attempt) {
    if (snapshot.state === ModerationItemState.SETTLED) {
        return {
            accepted: false,
            code: 'moderation.already_settled',
            winner: snapshot.verdict !== null && snapshot.settledBy !== null
                ? { verdict: snapshot.verdict, settledBy: snapshot.settledBy }
                : null,
        };
    }
    if (attempt.expectedDecisionVersion !== snapshot.decisionVersion) {
        return { accepted: false, code: 'moderation.decision_version_stale', winner: null };
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
export function canOverride(existingOrigin, incomingOrigin) {
    const existingIsHuman = existingOrigin === StateChangeOrigin.HUMAN_VERDICT;
    const incomingIsHuman = incomingOrigin === StateChangeOrigin.HUMAN_VERDICT;
    if (existingIsHuman && !incomingIsHuman)
        return false;
    return true;
}
export function assertCanOverride(existingOrigin, incomingOrigin) {
    if (!canOverride(existingOrigin, incomingOrigin)) {
        throw new DomainError({
            code: 'moderation.automatic_cannot_override_human',
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
export function chatRatePerMinute(messagesInWindow) {
    return Math.round((messagesInWindow / CHAT_RATE_WINDOW_SECONDS) * 60);
}
/** Past the threshold, the console stops showing the chat message by message. */
export function shouldCollapseToQueue(messagesInWindow) {
    return chatRatePerMinute(messagesInWindow) >= CHAT_BURST_THRESHOLD_PER_MINUTE;
}
/** A sanction carries an EXPIRY INSTANT, never a label. */
export function sanctionExpiryFrom(sanctionedAt, durationMinutes) {
    return durationMinutes === null ? null : plusMinutes(sanctionedAt, durationMinutes);
}
export function isSanctionActive(expiresAt, now) {
    return expiresAt === null || isAfter(expiresAt, now);
}
//# sourceMappingURL=index.js.map