/**
 * Les vocabulaires du catalogue : ce qui est publie, diffuse, et ce qui en
 * decide l'etat.
 *
 * ⚠ CE FICHIER EST DECLARANT. La porte `arthome-check-enums` y decouvre les
 * valeurs et signale toute recopie ailleurs dans le depot. C'est pour cela que
 * les regles importent les objets de membres nommes ci-dessous et n'ecrivent
 * jamais une chaine litterale.
 */

/**
 * L'acte de la chaine. Vocabulaire de `catalogue.json`, qui fait autorite (D2).
 * `replay-online` dit ce que `replay` ne dit pas : la rediffusion est EN VENTE.
 * Les tables paralleles des deux maquettes de studio — `hidden`, `sched`,
 * `tech`, `done` — ne sont jamais reprises.
 */
export const PUBLICATION_STATES = [
  'draft',
  'reserve',
  'scheduled',
  'technical',
  'live',
  'ended',
  'replay-online',
] as const;
export type PublicationState = (typeof PUBLICATION_STATES)[number];

export const PublicationState = {
  DRAFT: 'draft',
  RESERVE: 'reserve',
  SCHEDULED: 'scheduled',
  TECHNICAL: 'technical',
  LIVE: 'live',
  ENDED: 'ended',
  REPLAY_ONLINE: 'replay-online',
} as const satisfies Record<string, PublicationState>;

/**
 * L'axe TECHNIQUE, et rien d'autre.
 *
 * `postponed` et `cancelled` sont RETIRES : c'etaient des echos de
 * `DateOutcome` loges dans l'etat technique — la meme faute que `reported`
 * dans le champ des sanctions (E4). Une regie n'a pas d'etat « annulee » :
 * elle a un plateau qui n'envoie rien.
 */
export const RUN_STATES = ['idle', 'rehearsal', 'on-air', 'interrupted', 'run-ended'] as const;
export type RunState = (typeof RUN_STATES)[number];

export const RunState = {
  IDLE: 'idle',
  REHEARSAL: 'rehearsal',
  ON_AIR: 'on-air',
  INTERRUPTED: 'interrupted',
  ENDED: 'run-ended',
} as const satisfies Record<string, RunState>;

/**
 * L'ISSUE. Elle est un FAIT sur la representation : jamais reecrite, jamais
 * effacee. C'est elle qui prime sur les deux autres axes.
 */
export const DATE_OUTCOMES = ['postponed', 'cancelled', 'interrupted'] as const;
export type DateOutcome = (typeof DATE_OUTCOMES)[number];

export const DateOutcome = {
  POSTPONED: 'postponed',
  CANCELLED: 'cancelled',
  INTERRUPTED: 'interrupted',
} as const satisfies Record<string, DateOutcome>;

/**
 * La QUATRIEME valeur, derivee et unique — la seule que les cartes affichent.
 *
 * Aucun des trois axes ne la portait, et chaque surface recomposait la
 * hierarchie a sa facon : la definition meme d'une valeur calculee deux fois.
 * Les trois issues la REMPLACENT quand elles existent.
 */
export const DISPLAY_STATES = [
  'scheduled-soon',
  'room-open',
  'on-air-live',
  'replay-available',
  'finished',
  'postponed',
  'cancelled',
  'interrupted',
] as const;
export type DisplayState = (typeof DISPLAY_STATES)[number];

export const DisplayState = {
  SCHEDULED: 'scheduled-soon',
  ROOM_OPEN: 'room-open',
  LIVE: 'on-air-live',
  REPLAY: 'replay-available',
  ENDED: 'finished',
  POSTPONED: 'postponed',
  CANCELLED: 'cancelled',
  INTERRUPTED: 'interrupted',
} as const satisfies Record<string, DisplayState>;

/**
 * La PROMESSE faite avant l'achat — c'est elle qui justifie l'ecart de tarif,
 * et le dossier en fait un principe.
 *
 * `sub` et `off` des maquettes mobile et de l'assistant de creation ne sont pas
 * du vocabulaire (E2) : `helpers.stateOf` testait litteralement
 * `policy !== 'none'`, donc une date creee avec `off` n'aurait JAMAIS ete
 * reconnue comme sans rediffusion.
 */
export const REPLAY_POLICIES = ['included', 'subscription', 'unit', 'none'] as const;
export type ReplayPolicy = (typeof REPLAY_POLICIES)[number];

export const ReplayPolicy = {
  INCLUDED: 'included',
  SUBSCRIPTION: 'subscription',
  UNIT: 'unit',
  NONE: 'none',
} as const satisfies Record<string, ReplayPolicy>;

export const RIGHTS_SCOPES = ['worldwide', 'restricted'] as const;
export type RightsScope = (typeof RIGHTS_SCOPES)[number];

export const RightsScope = {
  WORLDWIDE: 'worldwide',
  RESTRICTED: 'restricted',
} as const satisfies Record<string, RightsScope>;

/**
 * Un CODE, jamais une phrase.
 *
 * `geography.rightsPolicy.blackoutReasons[]` porte aujourd'hui `label` et
 * `labelEn` — du texte redige DANS la donnee, alors que tout le reste passe
 * par `enums.*`. C'est une fuite d'i18n dans le modele (E8).
 *
 * Orthographe : celle de `shared/`, a la lettre — donc `co-production` en
 * kebab-case, et non `co_production` (K6).
 */
export const BLACKOUT_REASONS = ['co-production', 'broadcaster', 'festival'] as const;
export type BlackoutReason = (typeof BLACKOUT_REASONS)[number];

export const BlackoutReason = {
  CO_PRODUCTION: 'co-production',
  BROADCASTER: 'broadcaster',
  FESTIVAL: 'festival',
} as const satisfies Record<string, BlackoutReason>;

/**
 * Vocabulaire REEL, corrige (D1).
 *
 * `taxonomy.json` declare `none | light | helpful`. Or `essential` — ABSENTE du
 * vocabulaire — est employee par cinq spectacles, traduite dans l'i18n, et
 * `hasLanguageBarrier` EN FAIT SON TEST. A l'inverse, `light` n'est employee
 * nulle part. Un vocabulaire ferme qui ne contient pas la valeur dont depend la
 * regle la plus visible de la surface n'est pas un vocabulaire ferme.
 */
export const LANGUAGE_DEPENDENCIES = ['none', 'helpful', 'essential'] as const;
export type LanguageDependency = (typeof LANGUAGE_DEPENDENCIES)[number];

export const LanguageDependency = {
  NONE: 'none',
  HELPFUL: 'helpful',
  ESSENTIAL: 'essential',
} as const satisfies Record<string, LanguageDependency>;

/** Les quatre natures d'incident visibles du spectateur. */
export const INCIDENT_KINDS = ['hold-screen', 'incident-postponed', 'incident-cancelled', 'incident-interrupted'] as const;
export type IncidentKind = (typeof INCIDENT_KINDS)[number];

export const IncidentKind = {
  HOLD_SCREEN: 'hold-screen',
  POSTPONED: 'incident-postponed',
  CANCELLED: 'incident-cancelled',
  INTERRUPTED: 'incident-interrupted',
} as const satisfies Record<string, IncidentKind>;

/**
 * La CAUSE, vocabulaire NOUVEAU et distinct de l'issue.
 *
 * `catalogue.incidentMessages` ne connait que quatre entrees, qui sont des
 * ISSUES. La regie mobile en distingue trois de plus qui n'existent dans aucun
 * vocabulaire, et `streaming.md` en nomme une quatrieme.
 */
export const INCIDENT_CAUSES = [
  'venue-feed-lost',
  'run-desk-disconnected',
  'bitrate-collapsed',
  'compatibility-worker-failed',
  'provider-error',
  'manual-cause',
] as const;
export type IncidentCause = (typeof INCIDENT_CAUSES)[number];

export const IncidentCause = {
  VENUE_FEED_LOST: 'venue-feed-lost',
  RUN_DESK_DISCONNECTED: 'run-desk-disconnected',
  BITRATE_COLLAPSED: 'bitrate-collapsed',
  COMPATIBILITY_WORKER_FAILED: 'compatibility-worker-failed',
  PROVIDER_ERROR: 'provider-error',
  MANUAL: 'manual-cause',
} as const satisfies Record<string, IncidentCause>;
