/**
 * Moderation: three separate axes, two counters, a written precedence.
 *
 * D6 / E3 — four vocabularies for one notion, and the fault was not the divergence: `reported`, a
 * TRIAGE state, sat in the SANCTIONS field, so the queue filtered `state === 'reported'` — a kind
 * filter wearing a state filter's shape.
 */
import type { Instant } from '../kernel/clock.js';
import type { ModerationVerdict } from '../vocabulary/moderation.js';
import { AudienceSanction, MessageState, ModerationItemState, StateChangeOrigin } from '../vocabulary/moderation.js';
/**
 * The single badge, derived from the three axes and never recomposed by a surface:
 *
 *   banned  >  muted  >  removed  >  published
 *
 * The precedence runs from the person towards the message — a sanction on the PERSON covers all
 * their messages, a removal bears on one.
 *
 * The order is load-bearing and no gate protects it: `check-vocabulary` compares member SETS, so
 * it read the documents' reversed list as agreeing. Reordering to match a document makes a banned
 * person's message show `removed`.
 */
export declare const MODERATION_BADGES: readonly ["banned", "muted", "removed", "published"];
export type ModerationBadge = (typeof MODERATION_BADGES)[number];
export declare const ModerationBadge: {
    readonly BANNED: "banned";
    readonly MUTED: "muted";
    readonly REMOVED: "removed";
    readonly PUBLISHED: "published";
};
export declare function moderationBadgeOf(messageState: MessageState, authorSanction: AudienceSanction): ModerationBadge;
/** The claim lease. Claiming is not settling: without an expiry a closed browser freezes a row
 * for the whole live show. */
export declare const CLAIM_LEASE_MINUTES = 3;
export declare function claimExpiryFrom(claimedAt: Instant): Instant;
export declare function isClaimExpired(claimExpiresAt: Instant, now: Instant): boolean;
/**
 * A moderation row as a verdict command read it.
 *
 * Two counters, and `studio-mobile` C3 had one. On the contract's own examples `claim` then
 * `release` settles nothing and still moves the version from 1 to 3, so a moderator who read the
 * queue, lost the network and settled saw their verdict refused — with the offline queue the one
 * concession granted to mobile. The rule underneath is a supersession, which one counter cannot
 * express: as long as a colleague has returned no verdict, your sanction applies.
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
export type SettlementOutcome = {
    readonly accepted: true;
} | {
    readonly accepted: false;
    readonly code: string;
    /** The WINNING verdict and its author, so the screen tells the truth. */
    readonly winner: {
        readonly verdict: ModerationVerdict;
        readonly settledBy: string;
    } | null;
};
/**
 * Accepted when the row is merely CLAIMED by a colleague — the supersession. A settled row is
 * refused with the winning verdict and its author, so the screen can show "X has already deleted
 * this message" rather than cost a second round trip mid-show.
 */
export declare function evaluateSettlement(snapshot: ModerationItemSnapshot, attempt: SettlementAttempt): SettlementOutcome;
/**
 * A human overturns an automatic decision, never the reverse: otherwise a retroactive filter erases
 * a judgement already made, and human judgement is what is kept 24 months and journalled by name.
 */
export declare function canOverride(existingOrigin: StateChangeOrigin, incomingOrigin: StateChangeOrigin): boolean;
export declare function assertCanOverride(existingOrigin: StateChangeOrigin, incomingOrigin: StateChangeOrigin): void;
/**
 * The chat's rate window, in a declared unit. `studio-mobile` inconsistency 6: the mockup computed
 * `messages / hours elapsed`, labelled it "MSG/MIN" and compared it against 60 msg/min.
 */
export declare const CHAT_RATE_WINDOW_SECONDS = 60;
export declare const CHAT_BURST_THRESHOLD_PER_MINUTE = 60;
export declare function chatRatePerMinute(messagesInWindow: number): number;
/** Past the threshold, the console stops showing the chat message by message. */
export declare function shouldCollapseToQueue(messagesInWindow: number): boolean;
/** A sanction carries an EXPIRY INSTANT, never a label. */
export declare function sanctionExpiryFrom(sanctionedAt: Instant, durationMinutes: number | null): Instant | null;
export declare function isSanctionActive(expiresAt: Instant | null, now: Instant): boolean;
//# sourceMappingURL=index.d.ts.map