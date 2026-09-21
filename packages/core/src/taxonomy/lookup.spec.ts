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
 * INVARIANT PROTEGE
 *   Le rang editorial fait autorite, et AUCUNE SURFACE NE REORDONNE.
 *
 * POURQUOI
 *   Le rang va du plus grand public au plus pointu, FAMILLES MELEES. Une
 *   surface qui trierait par famille, par ordre alphabetique ou par nombre de
 *   dates produirait un autre ordre — et il y en aurait cinq.
 */
describe('le rang editorial', () => {
  it('ordonne par rang, familles melees', () => {
    const ordered = disciplinesInEditorialOrder(taxonomy).map((entry) => entry.id);
    expect(ordered).toEqual(['theatre', 'dance', 'jazz']);
  });

  it("ne mute pas l'artefact servi", () => {
    // L'artefact est partage par tout le processus : `sort` mute en place, et
    // muter une donnee servie est un effet de bord a distance.
    const before = taxonomy.disciplines.map((entry) => entry.id);
    disciplinesInEditorialOrder(taxonomy);
    expect(taxonomy.disciplines.map((entry) => entry.id)).toEqual(before);
  });
});

/**
 * INVARIANT PROTEGE
 *   Un sous-genre se cherche DANS SA DISCIPLINE.
 *
 * POURQUOI
 *   `studio-web` (incoherence 10) a trouve `A.genre(id)` appele avec un seul
 *   argument alors que la fonction en attend deux. Ce n'est pas un detail :
 *   deux disciplines portent un sous-genre du meme nom — `contemporary` existe
 *   en theatre ET en jazz.
 */
describe('un sous-genre appartient a une discipline', () => {
  it('distingue deux sous-genres homonymes', () => {
    expect(findGenre(taxonomy, 'jazz', 'contemporary')?.i18nKey).toBe('genres.jazz.contemporary');
    expect(findGenre(taxonomy, 'theatre', 'contemporary')?.i18nKey).toBe('genres.theatre.contemporary');
  });

  it('ne trouve pas un sous-genre dans la mauvaise discipline', () => {
    expect(findGenre(taxonomy, 'jazz', 'ballet-classique')).toBeNull();
  });
});

/**
 * INVARIANT PROTEGE
 *   Une discipline est une FORME — jamais une langue, une epoque ni un pays —
 *   et elle prime sur une etiquette homonyme.
 *
 * POURQUOI
 *   B2 : le cahier des charges TV appelait `ballet` une discipline, alors que
 *   c'est un SOUS-GENRE de la danse, et `concerts` une discipline alors que
 *   c'est un FORMAT. La resolution par specificite decroissante encode cette
 *   hierarchie : une recherche sur « jazz » doit rendre la discipline entiere,
 *   pas une poignee de dates etiquetees.
 */
describe('la resolution d\'un terme libre', () => {
  it('prefere la discipline au sous-genre et a l\'etiquette', () => {
    expect(resolveTerm(taxonomy, 'jazz')).toEqual({ kind: 'discipline', id: 'jazz', disciplineId: null });
  });

  it('trouve un sous-genre avec sa discipline', () => {
    expect(resolveTerm(taxonomy, 'ballet-classique')).toEqual({
      kind: 'genre',
      id: 'ballet-classique',
      disciplineId: 'dance',
    });
  });

  it('trouve une etiquette par son alias, accents et espaces compris', () => {
    expect(resolveTerm(taxonomy, 'Plein Air')?.id).toBe('open-air');
  });

  it('rend null plutot que de deviner', () => {
    expect(resolveTerm(taxonomy, 'zzz')).toBeNull();
    expect(resolveTerm(taxonomy, '   ')).toBeNull();
  });

  it('normalise sans Intl — « opéra » et « opera » sont le meme terme', () => {
    expect(normalizeTerm('Opéra')).toBe('opera');
    expect(normalizeTerm('  Musique  Ancienne ')).toBe('musique-ancienne');
  });
});
