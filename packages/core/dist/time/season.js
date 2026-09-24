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
import { fromEpochMs, windowOf } from './instant.js';
/** The changeover month, in human numbering: 9 = September. */
export const SEASON_START_MONTH = 9;
/**
 * The season CONTAINING this instant, expressed in the given offset.
 *
 * The offset matters: a date on 31 August at 23:30 venue time can be
 * 1 September in UTC, and therefore a different season. The offset is an
 * argument, as everywhere else in this module.
 */
export function seasonBounds(instant, utcOffsetMinutes) {
    const shifted = new Date(Date.parse(instant) + utcOffsetMinutes * 60_000);
    const year = shifted.getUTCFullYear();
    const month = shifted.getUTCMonth() + 1;
    const startYear = month >= SEASON_START_MONTH ? year : year - 1;
    const offsetMs = utcOffsetMinutes * 60_000;
    const start = fromEpochMs(Date.UTC(startYear, SEASON_START_MONTH - 1, 1) - offsetMs);
    const end = fromEpochMs(Date.UTC(startYear + 1, SEASON_START_MONTH - 1, 1) - offsetMs);
    return windowOf(start, end);
}
/** A season's label, as a CODE: "2026-2027". Never a sentence. */
export function seasonLabel(instant, utcOffsetMinutes) {
    const startYear = new Date(Date.parse(seasonBounds(instant, utcOffsetMinutes).start)).getUTCFullYear();
    return `${String(startYear)}-${String(startYear + 1)}`;
}
//# sourceMappingURL=season.js.map