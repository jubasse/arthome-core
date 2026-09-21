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
export const MESSAGE_STATES = ['published', 'removed'] as const;
export type MessageState = (typeof MESSAGE_STATES)[number];

export const MessageState = {
  PUBLISHED: 'published',
  REMOVED: 'removed',
} as const;

/** AXIS 2 — the nature of the QUEUE ITEM. */
export const MODERATION_ITEM_STATES = ['reported', 'claimed', 'settled'] as const;
export type ModerationItemState = (typeof MODERATION_ITEM_STATES)[number];

export const ModerationItemState = {
  REPORTED: 'reported',
  CLAIMED: 'claimed',
  SETTLED: 'settled',
} as const;

/**
 * AXIS 3 — the sanction on the PERSON, WITHIN ONE CHANNEL.
 *
 * The same person is banned on one artist's channel and welcome on another's:
 * that is why the sanction belongs to `chat` and not to `identity`.
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
 * Where a state change came from — and the origin SURVIVES the settlement.
 *
 * Without it, "removed by the filter, then confirmed by X" collapses into
 * "removed by X", and we lose what it takes to measure the filter's quality
 * later. Free now, unrecoverable afterwards.
 *
 * `automatic-filter` (at ingestion) and `retroactive-filter` (reclassifying
 * what already exists) are TWO MOMENTS, not two names.
 */
export const STATE_CHANGE_ORIGINS = [
  'human_verdict',
  'retroactive_filter',
  'automatic_filter',
  'author_sanctioned',
] as const;
export type StateChangeOrigin = (typeof STATE_CHANGE_ORIGINS)[number];

export const StateChangeOrigin = {
  HUMAN_VERDICT: 'human_verdict',
  RETROACTIVE_FILTER: 'retroactive_filter',
  AUTOMATIC_FILTER: 'automatic_filter',
  AUTHOR_SANCTIONED: 'author_sanctioned',
} as const;

/**
 * Vocabulary from `catalogue.json`. Three parallel tables existed in the
 * mockups — `free | emoji | off` on the web and the run desk, `read` instead of
 * `read-only` — and the i18n files resolve only the first set (E2).
 */
export const CHAT_MODES = ['open', 'emoji', 'read_only', 'off'] as const;
export type ChatMode = (typeof CHAT_MODES)[number];

export const ChatMode = {
  OPEN: 'open',
  EMOJI: 'emoji',
  READ_ONLY: 'read_only',
  OFF: 'off',
} as const;

/**
 * Two vocabularies existed in the SAME mockup file — `souple / normale /
 * haute` in channel settings, `basse / moyenne / haute` on the moderation page
 * — and neither is in `shared/`.
 */
export const FILTER_SEVERITIES = ['low', 'medium', 'high'] as const;
export type FilterSeverity = (typeof FILTER_SEVERITIES)[number];

export const FilterSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;
