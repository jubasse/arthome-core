/**
 * The bounds of a live-performance SEASON: 1 September -> 31 August. That convention is written
 * nowhere in `shared/`, and the studio rightly refused to hard-code it (`studio-web` Q12).
 */

import { fromEpochMs, windowOf, type Instant, type Window } from './instant.js';

/** The changeover month, in human numbering: 9 = September. */
export const SEASON_START_MONTH = 9;

/**
 * The season CONTAINING this instant, expressed in the given offset.
 *
 * The offset matters: 31 August at 23:30 venue time is already 1 September in UTC, another season.
 */
export function seasonBounds(instant: Instant, utcOffsetMinutes: number): Window {
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
export function seasonLabel(instant: Instant, utcOffsetMinutes: number): string {
  const startYear = new Date(
    Date.parse(seasonBounds(instant, utcOffsetMinutes).start),
  ).getUTCFullYear();
  return `${String(startYear)}-${String(startYear + 1)}`;
}
