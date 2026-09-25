/**
 * The two clocks — the viewer's and the venue's: viewer's time first, venue time second when it
 * differs.
 *
 * D3: a FROZEN offset does not cross a daylight-saving change, so a date six months out displays at
 * the wrong hour. The offset is SERVED, recomputed for the instant concerned — the IANA database is
 * not bundled, and bundling it would cost hundreds of kilobytes in five applications.
 */

import { toEpochMs, type Instant, MINUTE_MS } from './instant.js';
import { DomainError } from '../kernel/errors.js';
import { DomainGuardCode } from '../vocabulary/error-codes.js';

/** A venue's time zone, served alongside the UTC instant it qualifies. */
export interface VenueClock {
  /** IANA identifier: "Europe/Paris". Never an abbreviation. */
  readonly timeZone: string;
  /** The offset COMPUTED BY THE SERVER for the qualified instant, in minutes. */
  readonly utcOffsetMinutes: number;
}

const IANA_SHAPE = /^[A-Za-z]+(?:[_+-][A-Za-z0-9]+)*(?:\/[A-Za-z0-9]+(?:[_+-][A-Za-z0-9]+)*)+$/;

/**
 * Validates SHAPE, never existence: the IANA database is not bundled. "CEST" and "+02:00" are
 * refused — the two forms D3 replaces.
 */
export function venueClock(timeZone: string, utcOffsetMinutes: number): VenueClock {
  if (!IANA_SHAPE.test(timeZone)) {
    throw new DomainError({ code: DomainGuardCode.TIMEZONE_NOT_IANA, params: { timeZone } });
  }
  if (!Number.isInteger(utcOffsetMinutes) || Math.abs(utcOffsetMinutes) > 16 * 60) {
    throw new DomainError({
      code: DomainGuardCode.TIMEZONE_OFFSET_OUT_OF_RANGE,
      params: { offset: String(utcOffsetMinutes) },
    });
  }
  return { timeZone, utcOffsetMinutes };
}

/** Do the two clocks differ for this instant? The viewer's offset is an argument, not a global. */
export function clocksDiffer(venue: VenueClock, viewerUtcOffsetMinutes: number): boolean {
  return venue.utcOffsetMinutes !== viewerUtcOffsetMinutes;
}

/**
 * The DAY shift between the two clocks: -1, 0 or +1.
 *
 * A date at 23:30 venue time can be the next day for the viewer — the case that made D3 fail.
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

/** The wall-clock components of an instant in a given offset. NUMBERS, never a formatted string. */
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
