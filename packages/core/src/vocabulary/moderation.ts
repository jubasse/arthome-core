/**
 * Moderation's three axes, kept apart (D6/E3). Four vocabularies coexisted in
 * `shared/` for one notion, and `reported` — a triage state — sat in the
 * sanctions field, so the queue filtered `state === 'reported'`: a kind filter,
 * not a state filter.
 */

/** Axis 1 — the message's state, and there are only two. */
export const MESSAGE_STATES = ['published', 'removed'] as const;
export type MessageState = (typeof MESSAGE_STATES)[number];

export const MessageState = {
  PUBLISHED: 'published',
  REMOVED: 'removed',
} as const;

/** Axis 2 — the nature of the queue item. */
export const MODERATION_ITEM_STATES = ['reported', 'claimed', 'settled'] as const;
export type ModerationItemState = (typeof MODERATION_ITEM_STATES)[number];

export const ModerationItemState = {
  REPORTED: 'reported',
  CLAIMED: 'claimed',
  SETTLED: 'settled',
} as const;

/**
 * Axis 3 — the sanction on the person, within one channel. The same person is
 * banned on one artist's channel and welcome on another's, which is why the
 * sanction belongs to `chat` and not to `identity`.
 */
export const AUDIENCE_SANCTIONS = ['none', 'muted', 'banned'] as const;
export type AudienceSanction = (typeof AUDIENCE_SANCTIONS)[number];

export const AudienceSanction = {
  NONE: 'none',
  MUTED: 'muted',
  BANNED: 'banned',
} as const;

export const MODERATION_VERDICTS = ['publish', 'remove', 'mute', 'ban'] as const;
export type ModerationVerdict = (typeof MODERATION_VERDICTS)[number];

export const ModerationVerdict = {
  PUBLISH: 'publish',
  REMOVE: 'remove',
  MUTE: 'mute',
  BAN: 'ban',
} as const;

/**
 * Why a message was reported; `shared/catalogue.json` has authority.
 *
 * ⚠ `filter` is not a reason but an origin and belongs to
 * `STATE_CHANGE_ORIGINS`: putting it here would give one field two axes.
 */
export const MODERATION_REASONS = ['spam', 'insult', 'spoiler', 'off_topic', 'harassment'] as const;
export type ModerationReason = (typeof MODERATION_REASONS)[number];

export const ModerationReason = {
  SPAM: 'spam',
  INSULT: 'insult',
  SPOILER: 'spoiler',
  OFF_TOPIC: 'off_topic',
  HARASSMENT: 'harassment',
} as const;

/**
 * Where a state change came from; the origin survives the settlement, so
 * "removed by the filter, then confirmed by X" does not collapse into "removed
 * by X".
 *
 * ⚠ The order is chronological — ingestion before reclassification — and
 * load-bearing: the emit gate compares enum lists where `check-vocabulary`
 * compares only member sets.
 */
export const STATE_CHANGE_ORIGINS = [
  'human_verdict',
  'automatic_filter',
  'retroactive_filter',
  'author_sanctioned',
] as const;
export type StateChangeOrigin = (typeof STATE_CHANGE_ORIGINS)[number];

export const StateChangeOrigin = {
  HUMAN_VERDICT: 'human_verdict',
  AUTOMATIC_FILTER: 'automatic_filter',
  RETROACTIVE_FILTER: 'retroactive_filter',
  AUTHOR_SANCTIONED: 'author_sanctioned',
} as const;

/** The chat mode a channel is in; `catalogue.json` has authority. */
export const CHAT_MODES = ['open', 'emoji', 'read_only', 'off'] as const;
export type ChatMode = (typeof CHAT_MODES)[number];

export const ChatMode = {
  OPEN: 'open',
  EMOJI: 'emoji',
  READ_ONLY: 'read_only',
  OFF: 'off',
} as const;

/** The automatic filter's severity. */
export const FILTER_SEVERITIES = ['low', 'medium', 'high'] as const;
export type FilterSeverity = (typeof FILTER_SEVERITIES)[number];

export const FilterSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;
