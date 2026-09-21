import { describe, expect, it } from 'vitest';

import { disciplinesInEditorialOrder, findGenre, normalizeTerm, resolveTerm } from './lookup.js';
import type { Taxonomy } from './types.js';

const taxonomy: Taxonomy = {
  version: 8,
  families: [
    { id: 'music', i18nKey: 'families.music' },
    { id: 'stage', i18nKey: 'families.stage' },
  ],
  disciplines: [
    {
      id: 'jazz',
      familyId: 'music',
      i18nKey: 'categories.jazz',
      rank: 7,
      hue: 40,
      genres: [{ id: 'contemporary', i18nKey: 'genres.jazz.contemporary', suggests: [] }],
    },
    {
      id: 'theatre',
      familyId: 'stage',
      i18nKey: 'categories.theatre',
      rank: 2,
      hue: 10,
      genres: [{ id: 'contemporary', i18nKey: 'genres.theatre.contemporary', suggests: [] }],
    },
    {
      id: 'dance',
      familyId: 'stage',
      i18nKey: 'categories.dance',
      rank: 5,
      hue: 200,
      genres: [{ id: 'ballet-classique', i18nKey: 'genres.dance.ballet-classique', suggests: [] }],
    },
  ],
  tags: [{ id: 'open-air', i18nKey: 'tags.open-air', category: 'CONTEXT', aliases: ['plein air'] }],
  attributeGroups: [],
};

/**
 * PROTECTED INVARIANT
 *   The editorial rank is authoritative, and NO SURFACE REORDERS.
 *
 * WHY
 *   The rank runs from the most popular to the most specialised, FAMILIES
 *   MIXED. A surface sorting by family, alphabetically or by number of dates
 *   would produce a different order — and there would be five of them.
 */
describe('the editorial rank', () => {
  it('orders by rank, families mixed', () => {
    const ordered = disciplinesInEditorialOrder(taxonomy).map((entry) => entry.id);
    expect(ordered).toEqual(['theatre', 'dance', 'jazz']);
  });

  it('does not mutate the served artefact', () => {
    // The artefact is shared by the whole process: `sort` mutates in place, and
    // mutating served data is an action at a distance.
    const before = taxonomy.disciplines.map((entry) => entry.id);
    disciplinesInEditorialOrder(taxonomy);
    expect(taxonomy.disciplines.map((entry) => entry.id)).toEqual(before);
  });
});

/**
 * PROTECTED INVARIANT
 *   A sub-genre is looked up WITHIN ITS DISCIPLINE.
 *
 * WHY
 *   `studio-web` (inconsistency 10) found `A.genre(id)` called with a single
 *   argument while the function expects two. That is not a detail: two
 *   disciplines carry a sub-genre of the same name — `contemporary` exists in
 *   theatre AND in jazz.
 */
describe('a sub-genre belongs to a discipline', () => {
  it('tells apart two sub-genres of the same name', () => {
    expect(findGenre(taxonomy, 'jazz', 'contemporary')?.i18nKey).toBe('genres.jazz.contemporary');
    expect(findGenre(taxonomy, 'theatre', 'contemporary')?.i18nKey).toBe(
      'genres.theatre.contemporary',
    );
  });

  it('does not find a sub-genre in the wrong discipline', () => {
    expect(findGenre(taxonomy, 'jazz', 'ballet-classique')).toBeNull();
  });
});

/**
 * PROTECTED INVARIANT
 *   A discipline is a FORM — never a language, a period or a country — and it
 *   outranks a tag of the same name.
 *
 * WHY
 *   B2: the TV brief called `ballet` a discipline, when it is a SUB-GENRE of
 *   dance, and `concerts` a discipline when it is a FORMAT. Resolution by
 *   decreasing specificity encodes that hierarchy: a search for "jazz" must
 *   return the whole discipline, not a handful of tagged dates.
 */
describe('resolving a free-text term', () => {
  it('prefers the discipline to the sub-genre and to the tag', () => {
    expect(resolveTerm(taxonomy, 'jazz')).toEqual({
      kind: 'discipline',
      id: 'jazz',
      disciplineId: null,
    });
  });

  it('finds a sub-genre with its discipline', () => {
    expect(resolveTerm(taxonomy, 'ballet-classique')).toEqual({
      kind: 'genre',
      id: 'ballet-classique',
      disciplineId: 'dance',
    });
  });

  it('finds a tag by its alias, accents and spaces included', () => {
    expect(resolveTerm(taxonomy, 'Plein Air')?.id).toBe('open-air');
  });

  it('returns null rather than guessing', () => {
    expect(resolveTerm(taxonomy, 'zzz')).toBeNull();
    expect(resolveTerm(taxonomy, '   ')).toBeNull();
  });

  it('normalises without Intl — "opéra" and "opera" are the same term', () => {
    expect(normalizeTerm('Opéra')).toBe('opera');
    expect(normalizeTerm('  Musique  Ancienne ')).toBe('musique-ancienne');
  });
});
