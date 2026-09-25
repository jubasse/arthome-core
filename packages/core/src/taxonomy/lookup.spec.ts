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

/** The editorial rank is authoritative and NO SURFACE REORDERS: five sorts would be five orders. */
describe('the editorial rank', () => {
  it('orders by rank, families mixed', () => {
    const ordered = disciplinesInEditorialOrder(taxonomy).map((entry) => entry.id);
    expect(ordered).toEqual(['theatre', 'dance', 'jazz']);
  });

  it('does not mutate the served artefact', () => {
    const before = taxonomy.disciplines.map((entry) => entry.id);
    disciplinesInEditorialOrder(taxonomy);
    expect(taxonomy.disciplines.map((entry) => entry.id)).toEqual(before);
  });
});

/**
 * `studio-web` (inconsistency 10): `A.genre(id)` was called with one argument for a function that
 * takes two. Two disciplines carry a sub-genre of the same name — `contemporary` in theatre AND in
 * jazz.
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
 * B2: the TV brief called `ballet` a discipline (it is a sub-genre of dance) and `concerts` one (it
 * is a format). Resolution by decreasing specificity encodes the hierarchy.
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
