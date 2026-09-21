import { describe, expect, it } from 'vitest';

import { seasonBounds, seasonLabel } from './season.js';

/**
 * PROTECTED INVARIANT
 *   A season's bounds are a DOMAIN notion, served once.
 *
 * WHY
 *   `studio-web` Q12: the period selector offers "season" next to 7, 30 and 90
 *   days, and it refused — rightly — to hard-code it in the studio. Without
 *   this rule, five surfaces would guess five changeover dates.
 */
describe('the live-performance season', () => {
  it('runs from 1 September to 31 August', () => {
    const bounds = seasonBounds('2026-11-20T20:00:00.000Z', 0);
    expect(bounds.start).toBe('2026-09-01T00:00:00.000Z');
    expect(bounds.end).toBe('2027-09-01T00:00:00.000Z');
  });

  it('attaches January to the season that began the previous September', () => {
    const bounds = seasonBounds('2027-01-15T20:00:00.000Z', 0);
    expect(bounds.start).toBe('2026-09-01T00:00:00.000Z');
    expect(seasonLabel('2027-01-15T20:00:00.000Z', 0)).toBe('2026-2027');
  });

  it('changes over at the right minute, in the venue time zone', () => {
    // The case that hurts: 31 August at 23:30 VENUE TIME is still the previous
    // season, even though the UTC instant is already 1 September.
    const instant = '2026-08-31T22:30:00.000Z'; // 00:30 on 1 Sept in Paris (UTC+2)

    expect(seasonLabel(instant, 0)).toBe('2025-2026'); // in UTC: 31 August
    expect(seasonLabel(instant, 120)).toBe('2026-2027'); // in Paris: 1 September
  });
});
