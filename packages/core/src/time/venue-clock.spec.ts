import { describe, expect, it } from 'vitest';

import { clocksDiffer, dayShift, venueClock, wallClockAt } from './venue-clock.js';

/**
 * D3: a FROZEN offset does not cross a daylight-saving change, so a date six months out displayed
 * at the wrong hour. The offset is served, and the shape is enforced here.
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
    const summer = venueClock('Europe/Paris', 120);
    const winter = venueClock('Europe/Paris', 60);

    expect(summer.timeZone).toBe(winter.timeZone);
    expect(summer.utcOffsetMinutes).not.toBe(winter.utcOffsetMinutes);
  });
});

/**
 * E7: the TV mockup read `fixtures.geography.viewerUtcOffsetMin`, which exists nowhere, so "time at
 * the venue" was computed against UTC. The viewer's offset is an ARGUMENT, never a global.
 */
describe('the two clocks', () => {
  it('detects the shift to the next day', () => {
    // 21:30 UTC is 23:30 in Paris (UTC+2) and 14:30 in Los Angeles (UTC-7): the same day.
    const instant = '2026-06-15T21:30:00.000Z';
    const paris = venueClock('Europe/Paris', 120);

    expect(dayShift(instant, paris, -420)).toBe(0);

    // At 23:30 UTC, Paris is on 16 June, Los Angeles still on the 15th.
    expect(dayShift('2026-06-15T23:30:00.000Z', paris, -420)).toBe(1);
  });

  it('detects the day before', () => {
    // 15:30 UTC is 17:30 in Paris (UTC+2) and 00:30 the next day in Tokyo (UTC+9).
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
    const wall = wallClockAt('2026-06-15T19:04:00.000Z', 120);
    expect(wall).toEqual({ year: 2026, month: 6, day: 15, hour: 21, minute: 4 });
  });
});
