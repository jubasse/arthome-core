import { describe, expect, it } from 'vitest';

import { Locale } from './locale.js';
import {
  formatClock,
  formatCountdown,
  formatDuration,
  formatLongDate,
  formatTimecode,
} from './time.js';

/** No `Intl`, and no guessed time zone: the offset is served, recomputed for the instant (D3). */
describe('the time, in the offset it is given', () => {
  const instant = '2026-09-21T19:04:00.000Z';

  it('returns the same time in two shapes according to the language', () => {
    expect(formatClock(instant, 120, Locale.FR)).toBe('21 h 04');
    expect(formatClock(instant, 120, Locale.EN)).toBe('9:04 PM');
  });

  it('returns TWO different times for two offsets — the two clocks', () => {
    expect(formatClock(instant, 120, Locale.FR)).toBe('21 h 04');
    expect(formatClock(instant, -240, Locale.FR)).toBe('15 h 04');
  });

  it('handles midnight and noon without getting the half-day wrong', () => {
    expect(formatClock('2026-09-21T22:00:00.000Z', 120, Locale.EN)).toBe('12:00 AM');
    expect(formatClock('2026-09-21T10:00:00.000Z', 120, Locale.EN)).toBe('12:00 PM');
  });

  it('names the day and the month without Intl', () => {
    expect(formatLongDate('2026-10-12T10:00:00.000Z', 120, Locale.FR)).toBe('lundi 12 octobre');
    expect(formatLongDate('2026-10-12T10:00:00.000Z', 120, Locale.EN)).toBe('Monday October 12');
  });

  it('changes day with the offset', () => {
    // 23:30 UTC is already the next day in Paris, still the day before in Montreal.
    const late = '2026-10-12T23:30:00.000Z';
    expect(formatLongDate(late, 120, Locale.FR)).toBe('mardi 13 octobre');
    expect(formatLongDate(late, -240, Locale.FR)).toBe('lundi 12 octobre');
  });
});

/** A DURATION is declared, a COUNTDOWN is counted. They are not the same thing. */
describe('duration and countdown', () => {
  it("declares a show's running time", () => {
    expect(formatDuration(150, Locale.FR)).toBe('2 h 30');
    expect(formatDuration(120, Locale.FR)).toBe('2 h');
    expect(formatDuration(45, Locale.FR)).toBe('45 min');
    expect(formatDuration(150, Locale.EN)).toBe('2h 30m');
  });

  it('counts in days beyond twenty-four hours', () => {
    expect(formatCountdown(42, Locale.FR)).toBe('42 min');
    expect(formatCountdown(130, Locale.FR)).toBe('2 h 10');
    expect(formatCountdown(4320, Locale.FR)).toBe('3 jours');
    expect(formatCountdown(1440, Locale.FR)).toBe('1 jour');
  });

  it('never returns a negative countdown', () => {
    // A drifting phone clock can produce a negative gap; "-3 min" is worse than "0 min".
    expect(formatCountdown(-50, Locale.FR)).toBe('0 min');
  });
});

/**
 * A timecode keeps one shape in every language: it is a position in a media item read off a scrub
 * bar, not a time of day, and localising it would make it unreadable.
 */
describe('the timecode', () => {
  it('omits the hours when there are none', () => {
    expect(formatTimecode(69)).toBe('1:09');
    expect(formatTimecode(3969)).toBe('1:06:09');
    expect(formatTimecode(0)).toBe('0:00');
  });

  it('clamps to zero rather than returning a negative time', () => {
    expect(formatTimecode(-5)).toBe('0:00');
  });
});
