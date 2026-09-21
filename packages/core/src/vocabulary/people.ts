/**
 * The vocabularies of people and rights.
 *
 * ⚠ THIS FILE IS A DECLARING FILE (see catalog.ts).
 */

/**
 * The EIGHT canonical roles from `catalogue.json`.
 *
 * E6 — `studio-data.js` folds them onto six personas and CRUSHES `director`,
 * `video` and `sound` into a single "run desk". But `grants` tells them apart:
 * `director` may invite `video` and `sound`, the other two may invite nobody.
 * Authorising on the short role would grant an invitation right that does not
 * exist. **The six personas are a LABEL, never a right** — they do not exist in
 * this package.
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
 * The post held on ONE date, as opposed to the role held in the channel.
 * Two scales, two lifecycles: confusing them would turn revoking a stand-in
 * into exclusion from the channel.
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
 * The studio's navigation entries.
 *
 * Access is the UNION of the roles held, NEVER a rank: someone holding both
 * `video` and `moderation` on the same channel opens the union of the two.
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

/** The six panes of a date sheet, opened according to effective rights. */
export const DATE_PANES = [
  'public',
  'pane-tickets',
  'pane-chat',
  'tech',
  'pane-crew',
  'pane-replay',
] as const;
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
 * A device IS registered; a SESSION is the (device, profile) pair.
 * E13: `catalogue.json` declares `devices` as an INTEGER and `fixtures.js` as
 * a LIST of objects. Two shapes, one name.
 */
export const DEVICE_KINDS = [
  'tv',
  'mobile',
  'tablet',
  'desktop',
  'stick',
  'console',
  'box',
] as const;
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
 * The studio journal is by-name AND situated: "who decided, when, from which
 * surface". `system` is an actor like any other — automatic standby screen,
 * lease expiry, automatic moderation.
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

/** The third channel, proposed and not observed: `in-app`, not `sms` (D-017). */
export const NOTIFICATION_CHANNELS = ['push', 'email', 'in-app'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NotificationChannel = {
  PUSH: 'push',
  EMAIL: 'email',
  IN_APP: 'in-app',
} as const;
