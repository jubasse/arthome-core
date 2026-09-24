/**
 * The two clocks — the viewer's and the venue's.
 *
 * D3 — `shared/catalogue.json` stores `venue.utcOffsetMin`, a FROZEN offset,
 * and `helpers.js` derives the summer or winter abbreviation by comparing it
 * against a table. The RULE is right and ports as it stands: viewer's time
 * first, venue time second when it differs. The SHAPE does not survive: a fixed
 * offset does not cross a daylight-saving change, and a date scheduled six
 * months out displays at the wrong hour.
 *
 * E7 — and the TV mockup reads `fixtures.geography.viewerUtcOffsetMin`, which
 * EXISTS NOWHERE: it is `undefined`, so "time at the venue" is in fact computed
 * against UTC. The surface had no input at all for the viewer's time zone.
 *
 * ⚠ This module DOES NOT compute an offset from an IANA identifier: the time
 * zone database is not bundled, and bundling it would cost hundreds of
 * kilobytes in five applications. The offset is SERVED by the server,
 * recomputed for the instant concerned. So the computation happens ONCE.
 */

import { toEpochMs, type Instant, MINUTE_MS } from './instant.js';
import { DomainError } from '../kernel/errors.js';

/** A venue's time zone, served alongside the UTC instant it qualifies. */
export interface VenueClock {
  /** IANA identifier: "Europe/Paris". Never an abbreviation. */
  readonly timeZone: string;
  /** The offset COMPUTED BY THE SERVER for the qualified instant, in minutes. */
  readonly utcOffsetMinutes: number;
}

const IANA_SHAPE = /^[A-Za-z]+(?:[_+-][A-Za-z0-9]+)*(?:\/[A-Za-z0-9]+(?:[_+-][A-Za-z0-9]+)*)+$/;

/**
 * Validates SHAPE, never existence: the IANA database is not bundled.
 * "Europe/Paris" passes; "CEST" and "+02:00" are refused — precisely the two
 * forms D3 replaces.
 */
export function venueClock(timeZone: string, utcOffsetMinutes: number): VenueClock {
  if (!IANA_SHAPE.test(timeZone)) {
    throw new DomainError({ code: 'timezone.not_iana', params: { timeZone } });
  }
  if (!Number.isInteger(utcOffsetMinutes) || Math.abs(utcOffsetMinutes) > 16 * 60) {
    throw new DomainError({
      code: 'timezone.offset_out_of_range',
      params: { offset: String(utcOffsetMinutes) },
    });
  }
  return { timeZone, utcOffsetMinutes };
}

/**
 * Do the two clocks differ for this instant?
 *
 * The VIEWER's offset is an argument, never a global: that is exactly the
 * global state `helpers.js` carried, and two concurrent requests of one service
 * would share it.
 */
export function clocksDiffer(venue: VenueClock, viewerUtcOffsetMinutes: number): boolean {
  return venue.utcOffsetMinutes !== viewerUtcOffsetMinutes;
}

/**
 * The DAY shift between the two clocks: -1, 0 or +1.
 *
 * The studio shows "the day before" or "the next day" when moving from one
 * clock to the other changes the date. That is wrong with a frozen offset, and
 * it is the case that made D3 fail: a date at 23:30 venue time can be the next
 * day for the viewer.
 */
export function dayShift(
  instant: Instant,
  venue: VenueClock,
  viewerUtcOffsetMinutes: number,
): -1 | 0 | 1 {
  const ms = toEpochMs(instant);
  const venueDay = Math.floor((ms + venue.utcOffsetMinutes * MINUTE_MS) / 86_400_000);
  const viewerDay = Math.floor((ms + viewerUtcOffsetMinutes * MINUTE_MS) / 86_400_000);
  const delta = venueDay - viewerDay;
  return delta > 0 ? 1 : delta < 0 ? -1 : 0;
}

/**
 * The wall-clock components of an instant in a given offset.
 *
 * Returned as NUMBERS, never as a string: formatting is presentation and
 * depends on the locale.
 */
export interface WallClock {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
}

export function wallClockAt(instant: Instant, utcOffsetMinutes: number): WallClock {
  const shifted = new Date(toEpochMs(instant) + utcOffsetMinutes * MINUTE_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}
