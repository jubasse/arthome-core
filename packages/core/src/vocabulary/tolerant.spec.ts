import { describe, expect, it } from 'vitest';

import { DATE_OUTCOMES, DisplayState } from './catalog.js';
import { PLAN_OPENINGS, PlanOpening } from './commerce.js';
import { isMember, memberOr, parseTolerant } from './tolerant.js';

/**
 * PROTECTED INVARIANT
 *   An unknown enumeration value is KEPT and treated as neutral. It fails
 *   neither the card nor the page.
 *
 * WHY THIS TEST EXISTS
 *   It is the only rule in this package whose defect cannot be fixed remotely.
 *   A TV store review is slow: a version published today will be running in
 *   living rooms a year from now. The day the catalogue gains a 22nd
 *   discipline, a new outcome or a new chat mode, THOSE TELEVISIONS WILL
 *   RECEIVE IT — and strict validation does not degrade a card, it fails the
 *   WHOLE PAGE.
 *
 *   Written BEFORE the rule, like the two other risky rules.
 */
describe('parseTolerant — the fleet\'s survival', () => {
  it('keeps an unknown 22nd discipline instead of rejecting it', () => {
    const result = parseTolerant(DATE_OUTCOMES, 'rescheduled-twice');

    expect(result.known).toBe(false);
    // The value is not lost: the surface can log it and show a generic label,
    // rather than a raw code or nothing at all.
    expect(result).toEqual({ known: false, raw: 'rescheduled-twice' });
  });

  it('recognises a value of the vocabulary and returns it typed', () => {
    const result = parseTolerant(DATE_OUTCOMES, 'cancelled');

    expect(result).toEqual({ known: true, value: 'cancelled' });
  });

  it('NEVER throws, whatever the input', () => {
    // The case that matters is not the plausible value: it is the one nobody
    // foresaw. An empty string, an identifier from another vocabulary, a value
    // from a future version.
    for (const raw of ['', 'live', 'UNSPECIFIED', 'étoile', '0', 'null']) {
      expect(() => parseTolerant(DATE_OUTCOMES, raw)).not.toThrow();
    }
  });

  it('does not fail a PAGE when a single card carries the unknown', () => {
    // The exact simulation of the feared defect: a page of cards of which ONE
    // carries an unheard-of value. The others must render.
    const page = ['cancelled', 'discipline-22', 'postponed'];

    const parsed = page.map((raw) => parseTolerant(DATE_OUTCOMES, raw));

    expect(parsed.filter((entry) => entry.known)).toHaveLength(2);
    expect(parsed).toHaveLength(3);
  });

  it('tells apart vocabularies that share a value', () => {
    // `replays` belongs to the plan openings AND to the studio navigation
    // entries: two different notions, one same word. Each vocabulary answers
    // for itself.
    expect(isMember(PLAN_OPENINGS, PlanOpening.REPLAYS)).toBe(true);
    expect(isMember(DATE_OUTCOMES, PlanOpening.REPLAYS)).toBe(false);
  });
});

/**
 * PROTECTED INVARIANT
 *   A fallback is ALWAYS explicit at the call site.
 *
 * WHY
 *   E1, verified: `helpers.planOf()` does `filter(...)[0] || plans()[0]`. No
 *   reference account finds its own, so ALL of them fall silently back to
 *   `free` — and since `plan.opens[]` conditions access to playback, that is an
 *   AUTHORISATION defect. A fallback hidden inside a utility function would
 *   reproduce exactly that defect.
 */
describe('memberOr — the fallback does not hide', () => {
  it('returns the requested fallback, not the vocabulary\'s first member', () => {
    expect(memberOr(DATE_OUTCOMES, 'unknown-value', 'cancelled')).toBe('cancelled');
    // And above all: the fallback is NOT `DATE_OUTCOMES[0]`.
    expect(memberOr(DATE_OUTCOMES, 'unknown-value', 'interrupted')).toBe('interrupted');
  });

  it('returns the value when it is known', () => {
    expect(memberOr(DATE_OUTCOMES, 'postponed', 'cancelled')).toBe('postponed');
  });
});

describe('the named members equal the wire values', () => {
  it('exposes the same string as shared/\'s spelling', () => {
    // K6: three spellings for a value `decideWatch` depends on. On the wire, it
    // is `shared/`'s kebab-case that has authority.
    expect(PlanOpening.MULTI_SCREEN).toBe('multi-screen');
    expect(PlanOpening.FREE_DATES).toBe('free-dates');
    expect(PlanOpening.ONE_LIVE_MONTH).toBe('one-live-month');
    // And the outcome IS the displayed state: same value, two axes.
    expect(DisplayState.CANCELLED).toBe('cancelled');
  });
});
