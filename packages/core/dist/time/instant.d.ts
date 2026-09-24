/**
 * Instants, and the arithmetic we are allowed to do on them.
 *
 * D7 — `shared/catalogue.json` says it itself: "startOffsetMin, atMin and
 * rescheduledToOffsetMin are offsets from the moment the app is opened […]
 * NOTHING HERE EXPIRES". That is an excellent choice for a mockup: every state
 * exists at any hour, and all five surfaces see the same thing. It is unusable
 * in a contract.
 *
 * On the wire: ISO 8601 strings in UTC. In the database: `timestamptz`, in UTC.
 * And the zod decision imposes it by another route — `z.date()` cannot be
 * converted to JSON Schema.
 */
import type { Instant } from '../kernel/clock.js';
export type { Instant };
export declare const MINUTE_MS = 60000;
export declare const HOUR_MS = 3600000;
export declare const DAY_MS = 86400000;
export declare function toEpochMs(instant: Instant): number;
export declare function fromEpochMs(ms: number): Instant;
export declare function plusMinutes(instant: Instant, minutes: number): Instant;
export declare function plusHours(instant: Instant, hours: number): Instant;
export declare function minutesBetween(from: Instant, to: Instant): number;
export declare function isBefore(left: Instant, right: Instant): boolean;
export declare function isAfter(left: Instant, right: Instant): boolean;
export declare function earliest(left: Instant, right: Instant): Instant;
export declare function latest(left: Instant, right: Instant): Instant;
/** A half-open window: `[start, end)`. */
export interface Window {
    readonly start: Instant;
    readonly end: Instant;
}
export declare function windowOf(start: Instant, end: Instant): Window;
export declare function contains(window: Window, instant: Instant): boolean;
/**
 * Do two windows overlap?
 *
 * This is the domain rule that detects the OVERLAPPING SHIFTS in the mobile
 * studio — "two streams to hold tonight". It must live here rather than on two
 * surfaces: `studio-mobile` asked for that explicitly.
 */
export declare function overlaps(left: Window, right: Window): boolean;
//# sourceMappingURL=instant.d.ts.map