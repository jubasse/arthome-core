/**
 * The two clocks — the viewer's and the venue's: viewer's time first, venue time second when it
 * differs.
 *
 * D3: a FROZEN offset does not cross a daylight-saving change, so a date six months out displays at
 * the wrong hour. The offset is SERVED, recomputed for the instant concerned — the IANA database is
 * not bundled, and bundling it would cost hundreds of kilobytes in five applications.
 */
import { type Instant } from './instant.js';
/** A venue's time zone, served alongside the UTC instant it qualifies. */
export interface VenueClock {
    /** IANA identifier: "Europe/Paris". Never an abbreviation. */
    readonly timeZone: string;
    /** The offset COMPUTED BY THE SERVER for the qualified instant, in minutes. */
    readonly utcOffsetMinutes: number;
}
/**
 * Validates SHAPE, never existence: the IANA database is not bundled. "CEST" and "+02:00" are
 * refused — the two forms D3 replaces.
 */
export declare function venueClock(timeZone: string, utcOffsetMinutes: number): VenueClock;
/** Do the two clocks differ for this instant? The viewer's offset is an argument, not a global. */
export declare function clocksDiffer(venue: VenueClock, viewerUtcOffsetMinutes: number): boolean;
/**
 * The DAY shift between the two clocks: -1, 0 or +1.
 *
 * A date at 23:30 venue time can be the next day for the viewer — the case that made D3 fail.
 */
export declare function dayShift(instant: Instant, venue: VenueClock, viewerUtcOffsetMinutes: number): -1 | 0 | 1;
/** The wall-clock components of an instant in a given offset. NUMBERS, never a formatted string. */
export interface WallClock {
    readonly year: number;
    readonly month: number;
    readonly day: number;
    readonly hour: number;
    readonly minute: number;
}
export declare function wallClockAt(instant: Instant, utcOffsetMinutes: number): WallClock;
//# sourceMappingURL=venue-clock.d.ts.map