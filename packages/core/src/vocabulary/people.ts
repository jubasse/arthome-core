/** The vocabularies of people and rights. */

/**
 * The eight canonical roles from `catalogue.json`.
 *
 * ⚠ The six studio personas are a label, never a right: they crush `director`,
 * `video` and `sound` into one "run desk", and authorising on that short role
 * would grant `director`'s invitation right to `video` and `sound` (E6).
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
 * The post held on one date, not the role held in the channel: confusing the two
 * would turn revoking a stand-in into exclusion from the channel.
 */
export const CREW_ROLES = ['director', 'video', 'sound', 'moderation'] as const;
export type CrewRole = (typeof CREW_ROLES)[number];

export const CrewRole = {
  DIRECTOR: 'director',
  VIDEO: 'video',
  SOUND: 'sound',
  MODERATION: 'moderation',
} as const;

/**
 * The studio's navigation entries. Access is the union of the roles held, never
 * a rank: `video` plus `moderation` opens the union of the two.
 */
export const NAVIGATION_ENTRIES = [
  'agenda',
  'dashboard',
  'moderation_page',
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
  MODERATION: 'moderation_page',
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
export const DATE_PANES = ['public', 'tickets', 'chat', 'tech', 'crew', 'replay'] as const;
export type DatePane = (typeof DATE_PANES)[number];

export const DatePane = {
  PUBLIC: 'public',
  TICKETS: 'tickets',
  CHAT: 'chat',
  TECH: 'tech',
  CREW: 'crew',
  REPLAY: 'replay',
} as const;

/**
 * A device is registered; a session is the (device, profile) pair. E13:
 * `catalogue.json` declares `devices` as an integer and `fixtures.js` as a list
 * of objects — two shapes, one name.
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
 * The seven services.
 *
 * 174 operations across the two contracts declare `x-arthome-upstream`, which is
 * what makes fan-out countable, and nothing compared those names to anything:
 * three declared services they never call, and `realtime` — the real-time
 * gateway's Redis resume buffer, not a service — made upstream counts read eight
 * services out of seven.
 */
export const SERVICES = [
  'identity',
  'catalog',
  'ticketing',
  'streaming',
  'chat',
  'payouts',
  'notifications',
] as const;
export type Service = (typeof SERVICES)[number];

export const Service = {
  IDENTITY: 'identity',
  CATALOG: 'catalog',
  TICKETING: 'ticketing',
  STREAMING: 'streaming',
  CHAT: 'chat',
  PAYOUTS: 'payouts',
  NOTIFICATIONS: 'notifications',
} as const;

/**
 * Everything a BFF operation may declare as its upstream: the seven services,
 * plus what is depended on without being one. A gate compares every
 * `x-arthome-upstream` member against this list.
 */
export const UPSTREAMS: readonly [...typeof SERVICES, 'realtime'] = [
  ...SERVICES,
  'realtime',
] as const;
export type Upstream = (typeof UPSTREAMS)[number];

/**
 * Where a decision was taken — the studio journal is by-name and situated, and
 * `system` is an actor like any other (standby screen, lease expiry).
 */
export const SURFACES = [
  'storefront_web',
  'storefront_mobile',
  'storefront_tv',
  'studio_web',
  'studio_mobile',
  'system',
] as const;
export type Surface = (typeof SURFACES)[number];

export const Surface = {
  STOREFRONT_WEB: 'storefront_web',
  STOREFRONT_MOBILE: 'storefront_mobile',
  STOREFRONT_TV: 'storefront_tv',
  STUDIO_WEB: 'studio_web',
  STUDIO_MOBILE: 'studio_mobile',
  SYSTEM: 'system',
} as const;

/** The channels a notification takes; the third is `in_app`, not `sms` (D-017). */
export const NOTIFICATION_CHANNELS = ['push', 'email', 'in_app'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NotificationChannel = {
  PUSH: 'push',
  EMAIL: 'email',
  IN_APP: 'in_app',
} as const;
