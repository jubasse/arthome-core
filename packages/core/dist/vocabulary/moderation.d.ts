/**
 * Moderation's THREE AXES, kept apart — this is the D6/E3 correction.
 *
 * Four vocabularies coexisted in `shared/` for one notion. The underlying fault
 * was not that they diverged: it was that `reported` — a TRIAGE state — sat in
 * the SANCTIONS field. That is why the queue was built by filtering
 * `state === 'reported'`, which is not a state filter but a kind filter.
 *
 * ⚠ THIS FILE IS A DECLARING FILE (see catalog.ts).
 */
/**
 * AXIS 1 — the MESSAGE's state. Two values, and two only.
 *
 * `muted` and `banned` leave this axis: they never made sense here, they are
 * about the person. `ok` becomes `published`, which is the i18n vocabulary and
 * the only one that says what it does.
 */
export declare const MESSAGE_STATES: readonly ["published", "removed"];
export type MessageState = (typeof MESSAGE_STATES)[number];
export declare const MessageState: {
    readonly PUBLISHED: "published";
    readonly REMOVED: "removed";
};
/** AXIS 2 — the nature of the QUEUE ITEM. */
export declare const MODERATION_ITEM_STATES: readonly ["reported", "claimed", "settled"];
export type ModerationItemState = (typeof MODERATION_ITEM_STATES)[number];
export declare const ModerationItemState: {
    readonly REPORTED: "reported";
    readonly CLAIMED: "claimed";
    readonly SETTLED: "settled";
};
/**
 * AXIS 3 — the sanction on the PERSON, WITHIN ONE CHANNEL.
 *
 * The same person is banned on one artist's channel and welcome on another's:
 * that is why the sanction belongs to `chat` and not to `identity`.
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
 * Vocabulary from `shared/catalogue.json` `moderationReasons`, which has
 * authority — and which, unlike the other enums, had NO competitor here.
 *
 * An earlier version of the contract dropped `insult` and `spoiler` and
 * invented `hate` and `filter`: so it was THE CONTRACT holding a parallel table
 * against `shared/` — exactly the charge laid against the mockups.
 *
 * `spoiler` is THE ONLY reason specific to live performance, and it is
 * translated in `shared/i18n/studio.json`. And `filter` is not a reason, it is
 * an ORIGIN — see STATE_CHANGE_ORIGINS. Putting it here would give one field
 * two axes.
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
 * Where a state change came from — and the origin SURVIVES the settlement.
 *
 * Without it, "removed by the filter, then confirmed by X" collapses into
 * "removed by X", and we lose what it takes to measure the filter's quality
 * later. Free now, unrecoverable afterwards.
 *
 * `automatic-filter` (at ingestion) and `retroactive-filter` (reclassifying
 * what already exists) are TWO MOMENTS, not two names.
 */
export declare const STATE_CHANGE_ORIGINS: readonly ["human_verdict", "retroactive_filter", "automatic_filter", "author_sanctioned"];
export type StateChangeOrigin = (typeof STATE_CHANGE_ORIGINS)[number];
export declare const StateChangeOrigin: {
    readonly HUMAN_VERDICT: "human_verdict";
    readonly RETROACTIVE_FILTER: "retroactive_filter";
    readonly AUTOMATIC_FILTER: "automatic_filter";
    readonly AUTHOR_SANCTIONED: "author_sanctioned";
};
/**
 * Vocabulary from `catalogue.json`. Three parallel tables existed in the
 * mockups — `free | emoji | off` on the web and the run desk, `read` instead of
 * `read-only` — and the i18n files resolve only the first set (E2).
 */
export declare const CHAT_MODES: readonly ["open", "emoji", "read_only", "off"];
export type ChatMode = (typeof CHAT_MODES)[number];
export declare const ChatMode: {
    readonly OPEN: "open";
    readonly EMOJI: "emoji";
    readonly READ_ONLY: "read_only";
    readonly OFF: "off";
};
/**
 * Two vocabularies existed in the SAME mockup file — `souple / normale /
 * haute` in channel settings, `basse / moyenne / haute` on the moderation page
 * — and neither is in `shared/`.
 */
export declare const FILTER_SEVERITIES: readonly ["low", "medium", "high"];
export type FilterSeverity = (typeof FILTER_SEVERITIES)[number];
export declare const FilterSeverity: {
    readonly LOW: "low";
    readonly MEDIUM: "medium";
    readonly HIGH: "high";
};
//# sourceMappingURL=moderation.d.ts.map