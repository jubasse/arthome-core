import { describe, expect, it } from 'vitest';

import { FixedClock, SystemClock } from './clock.js';

/**
 * PROTECTED INVARIANT
 *   No rule reads the machine's clock. The clock is a PORT.
 *
 * WHY
 *   A test that passes at 23:59 and fails at 00:01 has found a forgotten
 *   `Date.now()`. And a package imported by seven services cannot carry global
 *   state: two concurrent requests would share the same clock.
 */
describe('the clock is injectable', () => {
  it('returns an ISO 8601 UTC instant, never an offset in minutes', () => {
    const clock = new FixedClock('2026-09-21T20:30:00.000Z');
    expect(clock.now()).toBe('2026-09-21T20:30:00.000Z');
    expect(clock.now()).toMatch(/Z$/);
  });

  it('is deterministic — two reads return the same instant', () => {
    const clock = new FixedClock('2026-09-21T20:30:00.000Z');
    expect(clock.now()).toBe(clock.now());
  });

  it('advances on demand, for window tests', () => {
    const clock = new FixedClock('2026-09-21T20:30:00.000Z');
    clock.advance(90 * 1000);
    expect(clock.now()).toBe('2026-09-21T20:31:30.000Z');
  });

  it('accepts an instant in milliseconds, for the deterministic data set', () => {
    const clock = new FixedClock(0);
    expect(clock.now()).toBe('1970-01-01T00:00:00.000Z');
    expect(clock.nowMs()).toBe(0);
  });

  it('the system clock is the only one that reads the machine', () => {
    const clock = new SystemClock();
    expect(clock.now()).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);
    expect(Math.abs(clock.nowMs() - Date.now())).toBeLessThan(1000);
  });
});
