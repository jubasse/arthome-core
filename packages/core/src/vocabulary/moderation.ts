/**
 * Les TROIS AXES de la moderation, separes — et c'est la correction de D6/E3.
 *
 * Quatre vocabulaires coexistaient dans `shared/` pour une meme notion. Le
 * defaut de fond n'etait pas qu'ils divergent : c'est que `reported` — un etat
 * de TRIAGE — etait loge dans le champ des SANCTIONS. C'est pour cela que la
 * file se construisait en filtrant `state === 'reported'`, ce qui n'est pas un
 * filtre d'etat mais un filtre de nature.
 *
 * ⚠ CE FICHIER EST DECLARANT (voir catalog.ts).
 */

/**
 * AXE 1 — l'etat du MESSAGE. Deux valeurs, et deux seulement.
 *
 * `muted` et `banned` disparaissent de cet axe : ils n'y ont jamais eu de sens,
 * ils portent sur la personne. `ok` devient `published`, qui est le vocabulaire
 * de l'i18n et le seul qui dise ce qu'il fait.
 */
export const MESSAGE_STATES = ['published', 'removed'] as const;
export type MessageState = (typeof MESSAGE_STATES)[number];

export const MessageState = {
  PUBLISHED: 'published',
  REMOVED: 'removed',
} as const satisfies Record<string, MessageState>;

/** AXE 2 — la nature de la LIGNE DE FILE. */
export const MODERATION_ITEM_STATES = ['reported', 'claimed', 'settled'] as const;
export type ModerationItemState = (typeof MODERATION_ITEM_STATES)[number];

export const ModerationItemState = {
  REPORTED: 'reported',
  CLAIMED: 'claimed',
  SETTLED: 'settled',
} as const satisfies Record<string, ModerationItemState>;

/**
 * AXE 3 — la sanction sur la PERSONNE, AU SEIN D'UNE CHAINE.
 *
 * La meme personne est bannie chez un artiste et bienvenue chez un autre :
 * c'est pourquoi la sanction appartient a `chat` et non a `identity`.
 */
export const AUDIENCE_SANCTIONS = ['none-sanction', 'muted', 'banned'] as const;
export type AudienceSanction = (typeof AUDIENCE_SANCTIONS)[number];

export const AudienceSanction = {
  NONE: 'none-sanction',
  MUTED: 'muted',
  BANNED: 'banned',
} as const satisfies Record<string, AudienceSanction>;

export const MODERATION_VERDICTS = ['publish', 'remove', 'mute', 'ban'] as const;
export type ModerationVerdict = (typeof MODERATION_VERDICTS)[number];

export const ModerationVerdict = {
  PUBLISH: 'publish',
  REMOVE: 'remove',
  MUTE: 'mute',
  BAN: 'ban',
} as const satisfies Record<string, ModerationVerdict>;

/**
 * Vocabulaire de `shared/catalogue.json` `moderationReasons`, qui fait autorite
 * — et qui n'avait ici AUCUN concurrent, contrairement aux autres enums.
 *
 * Une version anterieure du contrat perdait `insult` et `spoiler` et inventait
 * `hate` et `filter` : c'etait donc LE CONTRAT qui tenait une table parallele
 * contre `shared/`, exactement le reproche adresse aux maquettes.
 *
 * `spoiler` est LE SEUL motif propre au spectacle vivant, traduit dans
 * `shared/i18n/studio.json`. Et `filter` n'est pas un motif, c'est une ORIGINE
 * — voir STATE_CHANGE_ORIGINS. La loger ici donnerait deux axes a un champ.
 */
export const MODERATION_REASONS = ['spam', 'insult', 'spoiler', 'off-topic', 'harassment'] as const;
export type ModerationReason = (typeof MODERATION_REASONS)[number];

export const ModerationReason = {
  SPAM: 'spam',
  INSULT: 'insult',
  SPOILER: 'spoiler',
  OFF_TOPIC: 'off-topic',
  HARASSMENT: 'harassment',
} as const satisfies Record<string, ModerationReason>;

/**
 * D'ou vient un changement d'etat — et l'origine SURVIT au reglement.
 *
 * Sans elle, « retire par le filtre, puis confirme par X » s'ecrase en « retire
 * par X », et l'on perd de quoi mesurer la qualite du filtre. C'est gratuit
 * maintenant, irrattrapable ensuite.
 *
 * `automatic-filter` (a l'ingestion) et `retroactive-filter` (reclassement de
 * l'existant) sont DEUX MOMENTS, pas deux noms.
 */
export const STATE_CHANGE_ORIGINS = [
  'human-verdict',
  'retroactive-filter',
  'automatic-filter',
  'author-sanctioned',
] as const;
export type StateChangeOrigin = (typeof STATE_CHANGE_ORIGINS)[number];

export const StateChangeOrigin = {
  HUMAN_VERDICT: 'human-verdict',
  RETROACTIVE_FILTER: 'retroactive-filter',
  AUTOMATIC_FILTER: 'automatic-filter',
  AUTHOR_SANCTIONED: 'author-sanctioned',
} as const satisfies Record<string, StateChangeOrigin>;

/**
 * Vocabulaire de `catalogue.json`. Trois tables paralleles existaient dans les
 * maquettes — `free | emoji | off` cote web et console de regie, `read` au lieu
 * de `read-only` — et l'i18n ne resout que le premier jeu (E2).
 */
export const CHAT_MODES = ['open', 'emoji', 'read-only', 'off'] as const;
export type ChatMode = (typeof CHAT_MODES)[number];

export const ChatMode = {
  OPEN: 'open',
  EMOJI: 'emoji',
  READ_ONLY: 'read-only',
  OFF: 'off',
} as const satisfies Record<string, ChatMode>;

/**
 * Deux vocabulaires existaient dans le MEME fichier de maquette — `souple /
 * normale / haute` en reglages de chaine, `basse / moyenne / haute` en page de
 * moderation — et aucun n'est dans `shared/`.
 */
export const FILTER_SEVERITIES = ['low', 'medium', 'high'] as const;
export type FilterSeverity = (typeof FILTER_SEVERITIES)[number];

export const FilterSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const satisfies Record<string, FilterSeverity>;
