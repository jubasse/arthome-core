import { describe, expect, it } from 'vitest';

import { DATE_OUTCOMES, DisplayState } from './catalog.js';
import { PLAN_OPENINGS, PlanOpening } from './commerce.js';
import { isMember, memberOr, parseTolerant } from './tolerant.js';

/**
 * PROTECTED INVARIANT
 *   An unknown enumeration value is kept and treated as neutral; it fails
 *   neither the card nor the page.
 *
 * WHY THIS TEST EXISTS
 *   The defect cannot be fixed remotely — a TV build shipped today still runs a
 *   year later — and strict validation fails the whole page, not one card.
 */
describe("parseTolerant — the fleet's survival", () => {
  it('keeps an unknown 22nd discipline instead of rejecting it', () => {
    const result = parseTolerant(DATE_OUTCOMES, 'rescheduled-twice');

    expect(result.known).toBe(false);
    expect(result).toEqual({ known: false, raw: 'rescheduled-twice' });
  });

  it('recognises a value of the vocabulary and returns it typed', () => {
    const result = parseTolerant(DATE_OUTCOMES, 'cancelled');

    expect(result).toEqual({ known: true, value: 'cancelled' });
  });

  it('NEVER throws, whatever the input', () => {
    for (const raw of ['', 'live', 'UNSPECIFIED', 'étoile', '0', 'null']) {
      expect(() => parseTolerant(DATE_OUTCOMES, raw)).not.toThrow();
    }
  });

  it('does not fail a PAGE when a single card carries the unknown', () => {
    const page = ['cancelled', 'discipline-22', 'postponed'];

    const parsed = page.map((raw) => parseTolerant(DATE_OUTCOMES, raw));

    expect(parsed.filter((entry) => entry.known)).toHaveLength(2);
    expect(parsed).toHaveLength(3);
  });

  it('tells apart vocabularies that share a value', () => {
    expect(isMember(PLAN_OPENINGS, PlanOpening.REPLAYS)).toBe(true);
    expect(isMember(DATE_OUTCOMES, PlanOpening.REPLAYS)).toBe(false);
  });
});

/**
 * PROTECTED INVARIANT
 *   A fallback is always explicit at the call site: a default hidden inside a
 *   utility would reproduce E1, where `helpers.planOf()` fell silently back to
 *   `free` for every account while `plan.opens[]` gated playback.
 */
describe('memberOr — the fallback does not hide', () => {
  it("returns the requested fallback, not the vocabulary's first member", () => {
    expect(memberOr(DATE_OUTCOMES, 'unknown-value', 'cancelled')).toBe('cancelled');
    // Above all, the fallback is not `DATE_OUTCOMES[0]`.
    expect(memberOr(DATE_OUTCOMES, 'unknown-value', 'interrupted')).toBe('interrupted');
  });

  it('returns the value when it is known', () => {
    expect(memberOr(DATE_OUTCOMES, 'postponed', 'cancelled')).toBe('postponed');
  });
});

describe('the named members equal the wire values', () => {
  it("exposes the same string as shared/'s spelling", () => {
    expect(PlanOpening.MULTI_SCREEN).toBe('multi_screen');
    expect(PlanOpening.FREE_DATES).toBe('free_dates');
    expect(PlanOpening.ONE_LIVE_MONTH).toBe('one_live_month');
    // The outcome and the displayed state share one value: two axes, one string.
    expect(DisplayState.CANCELLED).toBe('cancelled');
  });
});
