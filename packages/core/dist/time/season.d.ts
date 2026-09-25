/**
 * The bounds of a live-performance SEASON: 1 September -> 31 August. That convention is written
 * nowhere in `shared/`, and the studio rightly refused to hard-code it (`studio-web` Q12).
 */
import { type Instant, type Window } from './instant.js';
/** The changeover month, in human numbering: 9 = September. */
export declare const SEASON_START_MONTH = 9;
/**
 * The season CONTAINING this instant, expressed in the given offset.
 *
 * The offset matters: 31 August at 23:30 venue time is already 1 September in UTC, another season.
 */
export declare function seasonBounds(instant: Instant, utcOffsetMinutes: number): Window;
/** A season's label, as a CODE: "2026-2027". Never a sentence. */
export declare function seasonLabel(instant: Instant, utcOffsetMinutes: number): string;
//# sourceMappingURL=season.d.ts.map