/**
 * Formatting time, without `Intl` — day and month names hard-coded in both
 * languages, as `helpers.js` carried them.
 *
 * Every one of these functions takes an OFFSET as an argument. None reads the
 * machine's clock or guesses a time zone: the server serves the offset,
 * recomputed for the instant concerned (D3).
 */
import { Locale } from './locale.js';
import { type Instant } from '../time/instant.js';
/** "21 h 04" in French, "9:04 PM" in English. */
export declare function formatClock(instant: Instant, utcOffsetMinutes: number, locale: Locale): string;
/** "samedi 12 octobre" — with no relative phrasing. */
export declare function formatLongDate(instant: Instant, utcOffsetMinutes: number, locale: Locale): string;
/**
 * "2 h 30" / "2h 30m" — a show's running time.
 *
 * Distinct from `formatCountdown`: a duration is not counted down, it is
 * declared.
 */
export declare function formatDuration(minutes: number, locale: Locale): string;
/**
 * "42 min", "2 h 10", "3 days" — a countdown.
 *
 * It takes a NUMBER OF MINUTES, never two instants: computing the gap belongs
 * to the caller, who must do it against the SERVER INSTANT (`servedAt`) and not
 * against the phone's clock. A mobile clock drifts in sleep, jumps on a time
 * zone change, and the user can set it — a countdown computed against it makes
 * every screen lie.
 */
export declare function formatCountdown(minutes: number, locale: Locale): string;
/** "1:04:09" — the position in a media item. Always the same shape. */
export declare function formatTimecode(totalSeconds: number): string;
//# sourceMappingURL=time.d.ts.map