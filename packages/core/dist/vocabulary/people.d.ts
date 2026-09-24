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
 * The post held on ONE date, as opposed to the role held in the channel.
 * Two scales, two lifecycles: confusing them would turn revoking a stand-in
 * into exclusion from the channel.
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
 * The studio's navigation entries.
 *
 * Access is the UNION of the roles held, NEVER a rank: someone holding both
 * `video` and `moderation` on the same channel opens the union of the two.
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
 * A device IS registered; a SESSION is the (device, profile) pair.
 * E13: `catalogue.json` declares `devices` as an INTEGER and `fixtures.js` as
 * a LIST of objects. Two shapes, one name.
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
 * The studio journal is by-name AND situated: "who decided, when, from which
 * surface". `system` is an actor like any other — automatic standby screen,
 * lease expiry, automatic moderation.
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
/** The third channel, proposed and not observed: `in-app`, not `sms` (D-017). */
export declare const NOTIFICATION_CHANNELS: readonly ["push", "email", "in_app"];
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
export declare const NotificationChannel: {
    readonly PUSH: "push";
    readonly EMAIL: "email";
    readonly IN_APP: "in_app";
};
//# sourceMappingURL=people.d.ts.map