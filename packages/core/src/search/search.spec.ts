import { describe, expect, it } from 'vitest';

import {
  CRITERIA_VERSION,
  criteriaSignature,
  emptyCriteria,
  migrateCriteria,
  normalizeSearchCriteria,
  sameCriteria,
  type SearchCriteria,
} from './index.js';

const criteria = (over: Partial<SearchCriteria> = {}): SearchCriteria => ({
  ...emptyCriteria(),
  ...over,
});

/**
 * PROTECTED INVARIANT
 *   Two equivalent entries produce THE SAME signature.
 *
 * WHY THIS TEST EXISTS
 *   The "already saved" deduplication appears on TWO screens (`browse` and
 *   `category`) and determines a WRITE. The mockup computes it client-side: so
 *   it is a value of `@arthome/core`, normalised once. If it depends on entry
 *   order, "already saved" lies and we create two alerts for one search.
 */
describe('the criteria signature', () => {
  it('does not depend on the order of the filters', () => {
    // The exact case: two disciplines and three tags ticked in two different
    // orders. That is ONE search.
    const left = criteria({
      disciplineIds: ['jazz', 'dance'],
      tagIds: ['open-air', 'revival', 'archive'],
    });
    const right = criteria({
      disciplineIds: ['dance', 'jazz'],
      tagIds: ['archive', 'open-air', 'revival'],
    });

    expect(sameCriteria(left, right)).toBe(true);
  });

  it('depends on neither the case nor the whitespace of the text', () => {
    expect(
      sameCriteria(criteria({ text: '  Nuit   Blanche ' }), criteria({ text: 'nuit blanche' })),
    ).toBe(true);
  });

  it('deduplicates a value ticked twice', () => {
    expect(
      sameCriteria(
        criteria({ disciplineIds: ['jazz', 'jazz'] }),
        criteria({ disciplineIds: ['jazz'] }),
      ),
    ).toBe(true);
  });

  it('TELLS APART two genuinely different searches', () => {
    // The test that guards against over-zealous normalisation: a signature that
    // made everything equal would be worse than no signature.
    expect(
      sameCriteria(criteria({ disciplineIds: ['jazz'] }), criteria({ disciplineIds: ['dance'] })),
    ).toBe(false);
    expect(sameCriteria(criteria({ text: 'carmen' }), criteria({ text: 'giselle' }))).toBe(false);
    expect(sameCriteria(criteria({ priceMaxMinor: 3000 }), criteria({ priceMaxMinor: 4000 }))).toBe(
      false,
    );
  });

  it('is readable in a log, not an opaque hash', () => {
    // A hash would have required a hashing source — hence a platform API —
    // which this package forbids itself. And it would be unreadable the day we
    // look for why two searches were conflated.
    const signature = criteriaSignature(criteria({ text: 'carmen', disciplineIds: ['opera'] }));
    expect(signature).toContain('q:carmen');
    expect(signature).toContain('d:opera');
  });
});

/**
 * PROTECTED INVARIANT
 *   An inverted range is PUT BACK THE RIGHT WAY ROUND, not refused.
 *
 * WHY
 *   A search is not a payment form: refusing a clumsy entry would cost an error
 *   screen for a perfectly clear intention.
 */
describe('normalising ranges', () => {
  it('puts a price range back the right way round', () => {
    const normalized = normalizeSearchCriteria(
      criteria({ priceMinMinor: 5000, priceMaxMinor: 2000 }),
    );
    expect(normalized.priceMinMinor).toBe(2000);
    expect(normalized.priceMaxMinor).toBe(5000);
  });

  it('leaves an open range as it is', () => {
    const normalized = normalizeSearchCriteria(
      criteria({ priceMinMinor: null, priceMaxMinor: 2000 }),
    );
    expect(normalized.priceMinMinor).toBeNull();
    expect(normalized.priceMaxMinor).toBe(2000);
  });
});

/**
 * PROTECTED INVARIANT
 *   A saved search REPLAYS or DECLARES ITSELF STALE. It never vanishes, and it
 *   never runs in silence on criteria it no longer understands.
 *
 * WHY
 *   `storefront-web` Q24: it survives months and version upgrades. An opaque
 *   serialisation of screen state, like the mockup's, does not allow that — and
 *   a silent run on misunderstood criteria would make the match counter wrong
 *   with nobody knowing.
 */
describe('surviving a grammar change', () => {
  it('replays a search of the current version', () => {
    const migration = migrateCriteria(criteria({ text: 'carmen' }));
    expect(migration.status).toBe('current');
  });

  it('declares a search of an earlier version stale', () => {
    const migration = migrateCriteria(criteria({ version: CRITERIA_VERSION - 1 }));
    expect(migration).toEqual({ status: 'stale', fromVersion: CRITERIA_VERSION - 1 });
  });

  it('declares a search of a FUTURE version stale rather than guessing', () => {
    // The application is behind the server — a real case on mobile, where a
    // store review is slow. We do not guess, we say so.
    const migration = migrateCriteria(criteria({ version: CRITERIA_VERSION + 1 }));
    expect(migration.status).toBe('stale');
  });
});
