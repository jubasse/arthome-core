/**
 * Moderation's three axes, kept apart (D6/E3). Four vocabularies coexisted in
 * `shared/` for one notion, and `reported` — a triage state — sat in the
 * sanctions field, so the queue filtered `state === 'reported'`: a kind filter,
 * not a state filter.
 */
/** Axis 1 — the message's state, and there are only two. */
export declare const MESSAGE_STATES: readonly ["published", "removed"];
export type MessageState = (typeof MESSAGE_STATES)[number];
export declare const MessageState: {
    readonly PUBLISHED: "published";
    readonly REMOVED: "removed";
};
/** Axis 2 — the nature of the queue item. */
export declare const MODERATION_ITEM_STATES: readonly ["reported", "claimed", "settled"];
export type ModerationItemState = (typeof MODERATION_ITEM_STATES)[number];
export declare const ModerationItemState: {
    readonly REPORTED: "reported";
    readonly CLAIMED: "claimed";
    readonly SETTLED: "settled";
};
/**
 * Axis 3 — the sanction on the person, within one channel. The same person is
 * banned on one artist's channel and welcome on another's, which is why the
 * sanction belongs to `chat` and not to `identity`.
 */
export declare const AUDIENCE_SANCTIONS: readonly ["none", "muted", "banned"];
export type AudienceSanction = (typeof AUDIENCE_SANCTIONS)[number];
export declare const AudienceSanction: {
    readonly NONE: "none";
    readonly MUTED: "muted";
    readonly BANNED: "banned";
};
export declare const MODERATION_VERDICTS: readonly ["publish", "remove", "mute", "ban"];
export type ModerationVerdict = (typeof MODERATION_VERDICTS)[number];
export declare const ModerationVerdict: {
    readonly PUBLISH: "publish";
    readonly REMOVE: "remove";
    readonly MUTE: "mute";
    readonly BAN: "ban";
};
/**
 * Why a message was reported; `shared/catalogue.json` has authority.
 *
 * ⚠ `filter` is not a reason but an origin and belongs to
 * `STATE_CHANGE_ORIGINS`: putting it here would give one field two axes.
 */
export declare const MODERATION_REASONS: readonly ["spam", "insult", "spoiler", "off_topic", "harassment"];
export type ModerationReason = (typeof MODERATION_REASONS)[number];
export declare const ModerationReason: {
    readonly SPAM: "spam";
    readonly INSULT: "insult";
    readonly SPOILER: "spoiler";
    readonly OFF_TOPIC: "off_topic";
    readonly HARASSMENT: "harassment";
};
/**
 * Where a state change came from; the origin survives the settlement, so
 * "removed by the filter, then confirmed by X" does not collapse into "removed
 * by X".
 *
 * ⚠ The order is chronological — ingestion before reclassification — and
 * load-bearing: the emit gate compares enum lists where `check-vocabulary`
 * compares only member sets.
 */
export declare const STATE_CHANGE_ORIGINS: readonly ["human_verdict", "automatic_filter", "retroactive_filter", "author_sanctioned"];
export type StateChangeOrigin = (typeof STATE_CHANGE_ORIGINS)[number];
export declare const StateChangeOrigin: {
    readonly HUMAN_VERDICT: "human_verdict";
    readonly AUTOMATIC_FILTER: "automatic_filter";
    readonly RETROACTIVE_FILTER: "retroactive_filter";
    readonly AUTHOR_SANCTIONED: "author_sanctioned";
};
/** The chat mode a channel is in; `catalogue.json` has authority. */
export declare const CHAT_MODES: readonly ["open", "emoji", "read_only", "off"];
export type ChatMode = (typeof CHAT_MODES)[number];
export declare const ChatMode: {
    readonly OPEN: "open";
    readonly EMOJI: "emoji";
    readonly READ_ONLY: "read_only";
    readonly OFF: "off";
};
/** The automatic filter's severity. */
export declare const FILTER_SEVERITIES: readonly ["low", "medium", "high"];
export type FilterSeverity = (typeof FILTER_SEVERITIES)[number];
export declare const FilterSeverity: {
    readonly LOW: "low";
    readonly MEDIUM: "medium";
    readonly HIGH: "high";
};
//# sourceMappingURL=moderation.d.ts.map