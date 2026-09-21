/**
 * Les vocabulaires des personnes et des droits.
 *
 * ⚠ CE FICHIER EST DECLARANT (voir catalog.ts).
 */

/**
 * Les HUIT roles canoniques de `catalogue.json`.
 *
 * E6 — `studio-data.js` les rabat sur six personas et ECRASE `director`,
 * `video` et `sound` en un seul « regie ». Or `grants` les distingue :
 * `director` peut inviter `video` et `sound`, les deux autres ne peuvent
 * inviter personne. Autoriser sur le role court accorderait un droit
 * d'invitation inexistant. **Les six personas sont un LIBELLE, jamais un
 * droit** — ils n'existent pas dans ce paquet.
 */
export const MEMBER_ROLES = [
  'artist',
  'production',
  'coordination',
  'director',
  'video',
  'sound',
  'moderation',
  'treasury',
] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const MemberRole = {
  ARTIST: 'artist',
  PRODUCTION: 'production',
  COORDINATION: 'coordination',
  DIRECTOR: 'director',
  VIDEO: 'video',
  SOUND: 'sound',
  MODERATION: 'moderation',
  TREASURY: 'treasury',
} as const;

/**
 * Le poste tenu sur UNE date, par opposition au role tenu dans la chaine.
 * Deux echelles, deux cycles de vie : les confondre ferait d'une revocation de
 * renfort une exclusion de chaine.
 */
export const CREW_ROLES = ['crew-director', 'crew-video', 'crew-sound', 'crew-moderation'] as const;
export type CrewRole = (typeof CREW_ROLES)[number];

export const CrewRole = {
  DIRECTOR: 'crew-director',
  VIDEO: 'crew-video',
  SOUND: 'crew-sound',
  MODERATION: 'crew-moderation',
} as const;

/**
 * Les quatorze entrees de navigation du studio.
 *
 * L'acces est l'UNION des roles tenus, JAMAIS un rang : une personne qui tient
 * `video` et `moderation` sur la meme chaine ouvre la reunion des deux.
 */
export const NAVIGATION_ENTRIES = [
  'agenda',
  'dashboard',
  'moderation-page',
  'crew',
  'events',
  'stream',
  'stats',
  'tickets',
  'store',
  'replays',
  'team',
  'payouts',
  'journal',
  'settings',
  'help',
] as const;
export type NavigationEntry = (typeof NAVIGATION_ENTRIES)[number];

export const NavigationEntry = {
  AGENDA: 'agenda',
  DASHBOARD: 'dashboard',
  MODERATION: 'moderation-page',
  CREW: 'crew',
  EVENTS: 'events',
  STREAM: 'stream',
  STATS: 'stats',
  TICKETS: 'tickets',
  STORE: 'store',
  REPLAYS: 'replays',
  TEAM: 'team',
  PAYOUTS: 'payouts',
  JOURNAL: 'journal',
  SETTINGS: 'settings',
  HELP: 'help',
} as const;

/** Les six volets d'une fiche de date, ouverts selon les droits effectifs. */
export const DATE_PANES = ['public', 'pane-tickets', 'pane-chat', 'tech', 'pane-crew', 'pane-replay'] as const;
export type DatePane = (typeof DATE_PANES)[number];

export const DatePane = {
  PUBLIC: 'public',
  TICKETS: 'pane-tickets',
  CHAT: 'pane-chat',
  TECH: 'tech',
  CREW: 'pane-crew',
  REPLAY: 'pane-replay',
} as const;

/**
 * Un appareil EST enregistre ; une SESSION est le couple (appareil, profil).
 * E13 : `catalogue.json` declare `devices` comme un ENTIER et `fixtures.js`
 * comme une LISTE d'objets. Deux formes, un nom.
 */
export const DEVICE_KINDS = ['tv', 'mobile', 'tablet', 'desktop', 'stick', 'console', 'box'] as const;
export type DeviceKind = (typeof DEVICE_KINDS)[number];

export const DeviceKind = {
  TV: 'tv',
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
  STICK: 'stick',
  CONSOLE: 'console',
  BOX: 'box',
} as const;

/**
 * Le journal du studio est nominatif ET situe : « qui a decide, quand, depuis
 * quelle surface ». `system` est un acteur comme un autre — ecran d'attente
 * automatique, expiration d'un bail, moderation automatique.
 */
export const SURFACES = [
  'storefront-web',
  'storefront-mobile',
  'storefront-tv',
  'studio-web',
  'studio-mobile',
  'system',
] as const;
export type Surface = (typeof SURFACES)[number];

export const Surface = {
  STOREFRONT_WEB: 'storefront-web',
  STOREFRONT_MOBILE: 'storefront-mobile',
  STOREFRONT_TV: 'storefront-tv',
  STUDIO_WEB: 'studio-web',
  STUDIO_MOBILE: 'studio-mobile',
  SYSTEM: 'system',
} as const;

/** Le troisieme canal, propose et non constate : `in-app`, pas `sms` (D-017). */
export const NOTIFICATION_CHANNELS = ['push', 'email', 'in-app'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NotificationChannel = {
  PUSH: 'push',
  EMAIL: 'email',
  IN_APP: 'in-app',
} as const;
