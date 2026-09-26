/** The vocabularies of people and rights. */
/**
 * The eight canonical roles from `catalogue.json`.
 *
 * The six studio personas are a label, never a right: they crush `director`,
 * `video` and `sound` into one "run desk", and authorising on that short role
 * would grant `director`'s invitation right to `video` and `sound` (E6).
 */
export declare const MEMBER_ROLES: readonly ["artist", "production", "coordination", "director", "video", "sound", "moderation", "treasury"];
export type MemberRole = (typeof MEMBER_ROLES)[number];
export declare const MemberRole: {
    readonly ARTIST: "artist";
    readonly PRODUCTION: "production";
    readonly COORDINATION: "coordination";
    readonly DIRECTOR: "director";
    readonly VIDEO: "video";
    readonly SOUND: "sound";
    readonly MODERATION: "moderation";
    readonly TREASURY: "treasury";
};
/**
 * The post held on one date, not the role held in the channel: confusing the two
 * would turn revoking a stand-in into exclusion from the channel.
 */
export declare const CREW_ROLES: readonly ["director", "video", "sound", "moderation"];
export type CrewRole = (typeof CREW_ROLES)[number];
export declare const CrewRole: {
    readonly DIRECTOR: "director";
    readonly VIDEO: "video";
    readonly SOUND: "sound";
    readonly MODERATION: "moderation";
};
/**
 * The studio's navigation entries. Access is the union of the roles held, never
 * a rank: `video` plus `moderation` opens the union of the two.
 */
export declare const NAVIGATION_ENTRIES: readonly ["agenda", "dashboard", "moderation_page", "crew", "events", "stream", "stats", "tickets", "store", "replays", "team", "payouts", "journal", "settings", "help"];
export type NavigationEntry = (typeof NAVIGATION_ENTRIES)[number];
export declare const NavigationEntry: {
    readonly AGENDA: "agenda";
    readonly DASHBOARD: "dashboard";
    readonly MODERATION: "moderation_page";
    readonly CREW: "crew";
    readonly EVENTS: "events";
    readonly STREAM: "stream";
    readonly STATS: "stats";
    readonly TICKETS: "tickets";
    readonly STORE: "store";
    readonly REPLAYS: "replays";
    readonly TEAM: "team";
    readonly PAYOUTS: "payouts";
    readonly JOURNAL: "journal";
    readonly SETTINGS: "settings";
    readonly HELP: "help";
};
/** The six panes of a date sheet, opened according to effective rights. */
export declare const DATE_PANES: readonly ["public", "tickets", "chat", "tech", "crew", "replay"];
export type DatePane = (typeof DATE_PANES)[number];
export declare const DatePane: {
    readonly PUBLIC: "public";
    readonly TICKETS: "tickets";
    readonly CHAT: "chat";
    readonly TECH: "tech";
    readonly CREW: "crew";
    readonly REPLAY: "replay";
};
/**
 * A device is registered; a session is the (device, profile) pair. E13:
 * `catalogue.json` declares `devices` as an integer and `fixtures.js` as a list
 * of objects — two shapes, one name.
 */
export declare const DEVICE_KINDS: readonly ["tv", "mobile", "tablet", "desktop", "stick", "console", "box"];
export type DeviceKind = (typeof DEVICE_KINDS)[number];
export declare const DeviceKind: {
    readonly TV: "tv";
    readonly MOBILE: "mobile";
    readonly TABLET: "tablet";
    readonly DESKTOP: "desktop";
    readonly STICK: "stick";
    readonly CONSOLE: "console";
    readonly BOX: "box";
};
/**
 * The seven services.
 *
 * 174 operations across the two contracts declare `x-arthome-upstream`, which is
 * what makes fan-out countable, and nothing compared those names to anything:
 * three declared services they never call, and `realtime` — the real-time
 * gateway's Redis resume buffer, not a service — made upstream counts read eight
 * services out of seven.
 */
export declare const SERVICES: readonly ["identity", "catalog", "ticketing", "streaming", "chat", "payouts", "notifications"];
export type Service = (typeof SERVICES)[number];
export declare const Service: {
    readonly IDENTITY: "identity";
    readonly CATALOG: "catalog";
    readonly TICKETING: "ticketing";
    readonly STREAMING: "streaming";
    readonly CHAT: "chat";
    readonly PAYOUTS: "payouts";
    readonly NOTIFICATIONS: "notifications";
};
/**
 * Everything a BFF operation may declare as its upstream: the seven services,
 * plus what is depended on without being one. A gate compares every
 * `x-arthome-upstream` member against this list.
 */
export declare const UPSTREAMS: readonly [...typeof SERVICES, 'realtime'];
export type Upstream = (typeof UPSTREAMS)[number];
/**
 * Where a decision was taken — the studio journal is by-name and situated, and
 * `system` is an actor like any other (standby screen, lease expiry).
 */
export declare const SURFACES: readonly ["storefront_web", "storefront_mobile", "storefront_tv", "studio_web", "studio_mobile", "system"];
export type Surface = (typeof SURFACES)[number];
export declare const Surface: {
    readonly STOREFRONT_WEB: "storefront_web";
    readonly STOREFRONT_MOBILE: "storefront_mobile";
    readonly STOREFRONT_TV: "storefront_tv";
    readonly STUDIO_WEB: "studio_web";
    readonly STUDIO_MOBILE: "studio_mobile";
    readonly SYSTEM: "system";
};
/** The channels a notification takes; the third is `in_app`, not `sms` (D-017). */
export declare const NOTIFICATION_CHANNELS: readonly ["push", "email", "in_app"];
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
export declare const NotificationChannel: {
    readonly PUSH: "push";
    readonly EMAIL: "email";
    readonly IN_APP: "in_app";
};
//# sourceMappingURL=people.d.ts.map