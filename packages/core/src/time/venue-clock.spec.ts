import { describe, expect, it } from 'vitest';

import { clocksDiffer, dayShift, venueClock, wallClockAt } from './venue-clock.js';

/**
 * PROTECTED INVARIANT
 *   A date scheduled six months out displays at the RIGHT hour — including on
 *   the far side of a daylight-saving change.
 *
 * WHY THIS TEST EXISTS
 *   This is the case that made D3 fail. `shared/catalogue.json` stores
 *   `venue.utcOffsetMin`, a FROZEN offset, and `helpers.js` derives the summer
 *   or winter abbreviation by comparing it against a table. The rule is right,
 *   the shape does not survive: a fixed offset does not cross a
 *   daylight-saving change.
 *
 *   So the offset is SERVED, recomputed by the server for the instant
 *   concerned — which this module enforces by refusing anything that is not an
 *   IANA identifier.
 */
describe('the time zone is an IANA identifier, not an offset', () => {
  it('refuses an abbreviation and an offset — the two shapes D3 replaces', () => {
    expect(() => venueClock('Europe/Paris', 120)).not.toThrow();
    expect(() => venueClock('CEST', 120)).toThrow();
    expect(() => venueClock('+02:00', 120)).toThrow();
    expect(() => venueClock('Europe/Paris', 17 * 60)).toThrow();
  });

  it('accepts the real IANA forms from the catalogue', () => {
    for (const zone of [
      'Europe/Paris',
      'America/New_York',
      'Europe/Zurich',
      'America/Argentina/Buenos_Aires',
    ]) {
      expect(() => venueClock(zone, 60)).not.toThrow();
    }
  });

  it('carries TWO offsets for the same venue, according to the season', () => {
    // The same venue, two instants, two offsets served. That is precisely what
    // a frozen field cannot express.
    const summer = venueClock('Europe/Paris', 120);
    const winter = venueClock('Europe/Paris', 60);

    expect(summer.timeZone).toBe(winter.timeZone);
    expect(summer.utcOffsetMinutes).not.toBe(winter.utcOffsetMinutes);
  });
});

/**
 * PROTECTED INVARIANT
 *   "The viewer's time first, the venue's time second when it differs" — with
 *   the "the day before" / "the next day" suffix when moving from one clock to
 *   the other changes the date.
 *
 * WHY
 *   E7: the TV mockup reads `fixtures.geography.viewerUtcOffsetMin`, which
 *   EXISTS NOWHERE. It is `undefined`, so "time at the venue" is computed
 *   against UTC, not against the viewer. The viewer's offset is therefore an
 *   ARGUMENT, never a global.
 */
describe('the two clocks', () => {
  it('detects the shift to the next day', () => {
    // 23:30 in Paris in summer (UTC+2) = 21:30 UTC. A viewer in Los Angeles
    // (UTC-7) is then at 14:30 on the SAME day: the venue is "the next day".
    const instant = '2026-06-15T21:30:00.000Z';
    const paris = venueClock('Europe/Paris', 120);

    expect(dayShift(instant, paris, -420)).toBe(0);

    // At 23:30 UTC, Paris is on 16 June, Los Angeles still on the 15th.
    expect(dayShift('2026-06-15T23:30:00.000Z', paris, -420)).toBe(1);
  });

  it('detects the day before', () => {
    // 17:30 in Paris in summer (UTC+2) = 15:30 UTC. A viewer in Tokyo (UTC+9)
    // is then at 00:30 the NEXT day: seen from there, the venue is "the day
    // before".
    const paris = venueClock('Europe/Paris', 120);
    expect(dayShift('2026-06-15T15:30:00.000Z', paris, 540)).toBe(-1);
  });

  it('reports no difference when the two clocks coincide', () => {
    const paris = venueClock('Europe/Paris', 120);
    expect(clocksDiffer(paris, 120)).toBe(false);
    expect(clocksDiffer(paris, 60)).toBe(true);
    expect(dayShift('2026-06-15T19:00:00.000Z', paris, 120)).toBe(0);
  });

  it('returns wall-clock components as numbers, never a formatted string', () => {
    // Formatting is presentation: it depends on the locale and lives elsewhere.
    // This module returns numbers.
    const wall = wallClockAt('2026-06-15T19:04:00.000Z', 120);
    expect(wall).toEqual({ year: 2026, month: 6, day: 15, hour: 21, minute: 4 });
  });
});
