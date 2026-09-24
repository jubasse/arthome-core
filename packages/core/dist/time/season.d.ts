/**
 * The bounds of a live-performance SEASON.
 *
 * `studio-web` Q12: the period selector offers "season" next to 7, 30 and 90
 * days, and it rightly refused to hard-code it in the studio. This is a domain
 * notion: served, never guessed by five surfaces.
 *
 * Convention: 1 September -> 31 August. That is the live-performance
 * convention, and it is written nowhere in `shared/` — hence this module.
 */
import { type Instant, type Window } from './instant.js';
/** The changeover month, in human numbering: 9 = September. */
export declare const SEASON_START_MONTH = 9;
/**
 * The season CONTAINING this instant, expressed in the given offset.
 *
 * The offset matters: a date on 31 August at 23:30 venue time can be
 * 1 September in UTC, and therefore a different season. The offset is an
 * argument, as everywhere else in this module.
 */
export declare function seasonBounds(instant: Instant, utcOffsetMinutes: number): Window;
/** A season's label, as a CODE: "2026-2027". Never a sentence. */
export declare function seasonLabel(instant: Instant, utcOffsetMinutes: number): string;
//# sourceMappingURL=season.d.ts.map