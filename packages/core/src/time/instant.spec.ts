import { describe, expect, it } from 'vitest';

import { plusMonths } from './instant.js';

describe('calendar months', () => {
  it('keeps the day and the time of day', () => {
    expect(plusMonths('2026-03-15T08:45:12.345Z', 1)).toBe('2026-04-15T08:45:12.345Z');
  });

  it('clamps a day the target month lacks to its last day', () => {
    expect(plusMonths('2027-01-31T10:00:00.000Z', 1)).toBe('2027-02-28T10:00:00.000Z');
    expect(plusMonths('2028-01-31T10:00:00.000Z', 1)).toBe('2028-02-29T10:00:00.000Z');
    expect(plusMonths('2026-05-31T10:00:00.000Z', -1)).toBe('2026-04-30T10:00:00.000Z');
  });

  it('crosses a year in both directions', () => {
    expect(plusMonths('2026-11-30T23:00:00.000Z', 3)).toBe('2027-02-28T23:00:00.000Z');
    expect(plusMonths('2026-02-10T00:00:00.000Z', -14)).toBe('2024-12-10T00:00:00.000Z');
  });

  it('counts in UTC, whatever the offset the instant was written with', () => {
    expect(plusMonths('2026-01-31T23:30:00-02:00', 1)).toBe('2026-03-01T01:30:00.000Z');
  });
});
