import { describe, expect, it } from 'vitest';

import { seasonBounds, seasonLabel } from './season.js';

/** `studio-web` Q12: without a served rule, five surfaces would guess five changeover dates. */
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
    const instant = '2026-08-31T22:30:00.000Z'; // 00:30 on 1 Sept in Paris (UTC+2)

    expect(seasonLabel(instant, 0)).toBe('2025-2026'); // in UTC: 31 August
    expect(seasonLabel(instant, 120)).toBe('2026-2027'); // in Paris: 1 September
  });
});
