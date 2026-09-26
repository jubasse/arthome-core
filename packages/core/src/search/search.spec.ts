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
 * "Already saved" determines a WRITE: a signature that depended on entry order
 * would lie, and we would create two alerts for one search.
 */
describe('the criteria signature', () => {
  it('does not depend on the order of the filters', () => {
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
    // A signature that made everything equal would be worse than no signature.
    expect(
      sameCriteria(criteria({ disciplineIds: ['jazz'] }), criteria({ disciplineIds: ['dance'] })),
    ).toBe(false);
    expect(sameCriteria(criteria({ text: 'carmen' }), criteria({ text: 'giselle' }))).toBe(false);
    expect(sameCriteria(criteria({ priceMaxMinor: 3000 }), criteria({ priceMaxMinor: 4000 }))).toBe(
      false,
    );
  });

  it('is readable in a log, not an opaque hash', () => {
    const signature = criteriaSignature(criteria({ text: 'carmen', disciplineIds: ['opera'] }));
    expect(signature).toContain('q:carmen');
    expect(signature).toContain('d:opera');
  });
});

// A search is not a payment form: refusing a clumsy entry costs an error screen.
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
    // The application is behind the server — real on mobile, where review is slow.
    const migration = migrateCriteria(criteria({ version: CRITERIA_VERSION + 1 }));
    expect(migration.status).toBe('stale');
  });
});
