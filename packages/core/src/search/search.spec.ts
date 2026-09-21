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
 * INVARIANT PROTEGE
 *   Deux saisies equivalentes produisent LA MEME signature.
 *
 * POURQUOI CE TEST EXISTE
 *   La deduplication « deja enregistree » s'affiche sur DEUX ecrans (`browse`
 *   et `category`) et determine une ECRITURE. La maquette la calcule cote
 *   client : c'est donc une valeur de `@arthome/core`, normalisee une fois.
 *   Si elle depend de l'ordre de saisie, « deja enregistree » ment et on cree
 *   deux alertes pour la meme recherche.
 */
describe('la signature des criteres', () => {
  it("ne depend pas de l'ordre des filtres", () => {
    // Le cas exact : deux disciplines et trois etiquettes cochees dans deux
    // ordres differents. C'est UNE recherche.
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

  it('ne depend ni de la casse ni des espaces du texte', () => {
    expect(
      sameCriteria(criteria({ text: '  Nuit   Blanche ' }), criteria({ text: 'nuit blanche' })),
    ).toBe(true);
  });

  it('deduplique une valeur cochee deux fois', () => {
    expect(
      sameCriteria(criteria({ disciplineIds: ['jazz', 'jazz'] }), criteria({ disciplineIds: ['jazz'] })),
    ).toBe(true);
  });

  it('DISTINGUE deux recherches reellement differentes', () => {
    // Le test qui protege contre une normalisation trop zelee : une signature
    // qui rendrait tout egal serait pire qu'aucune signature.
    expect(sameCriteria(criteria({ disciplineIds: ['jazz'] }), criteria({ disciplineIds: ['dance'] }))).toBe(false);
    expect(sameCriteria(criteria({ text: 'carmen' }), criteria({ text: 'giselle' }))).toBe(false);
    expect(sameCriteria(criteria({ priceMaxMinor: 3000 }), criteria({ priceMaxMinor: 4000 }))).toBe(false);
  });

  it('est lisible dans un journal, pas un hachage opaque', () => {
    // Un hachage aurait exige une source de hachage — donc une API de
    // plateforme — que ce paquet s'interdit. Et il serait illisible le jour ou
    // l'on cherche pourquoi deux recherches ont ete confondues.
    const signature = criteriaSignature(criteria({ text: 'carmen', disciplineIds: ['opera'] }));
    expect(signature).toContain('q:carmen');
    expect(signature).toContain('d:opera');
  });
});

/**
 * INVARIANT PROTEGE
 *   Un intervalle inverse est REMIS A L'ENDROIT, pas refuse.
 *
 * POURQUOI
 *   Une recherche n'est pas un formulaire de paiement : refuser une saisie
 *   maladroite couterait un ecran d'erreur pour une intention parfaitement
 *   claire.
 */
describe('la normalisation des intervalles', () => {
  it('remet un intervalle de prix a l\'endroit', () => {
    const normalized = normalizeSearchCriteria(criteria({ priceMinMinor: 5000, priceMaxMinor: 2000 }));
    expect(normalized.priceMinMinor).toBe(2000);
    expect(normalized.priceMaxMinor).toBe(5000);
  });

  it('laisse un intervalle ouvert tel quel', () => {
    const normalized = normalizeSearchCriteria(criteria({ priceMinMinor: null, priceMaxMinor: 2000 }));
    expect(normalized.priceMinMinor).toBeNull();
    expect(normalized.priceMaxMinor).toBe(2000);
  });
});

/**
 * INVARIANT PROTEGE
 *   Une recherche enregistree SE REJOUE ou SE DECLARE PERIMEE. Jamais elle ne
 *   disparait, jamais elle ne s'execute en silence sur des criteres qu'elle ne
 *   comprend plus.
 *
 * POURQUOI
 *   `storefront-web` Q24 : elle survit a des mois et a des montees de version.
 *   Une serialisation opaque de l'etat d'ecran, comme celle de la maquette, ne
 *   le permet pas — et une execution silencieuse sur des criteres mal compris
 *   rendrait le compteur de correspondances faux sans que personne le sache.
 */
describe('la survie a un changement de grammaire', () => {
  it('rejoue une recherche de la version courante', () => {
    const migration = migrateCriteria(criteria({ text: 'carmen' }));
    expect(migration.status).toBe('current');
  });

  it('declare perimee une recherche d\'une version anterieure', () => {
    const migration = migrateCriteria(criteria({ version: CRITERIA_VERSION - 1 }));
    expect(migration).toEqual({ status: 'stale', fromVersion: CRITERIA_VERSION - 1 });
  });

  it("declare perimee une recherche d'une version FUTURE plutot que de deviner", () => {
    // L'application est en retard sur le serveur — cas reel sur mobile, ou une
    // revue de magasin est lente. On ne devine pas, on le dit.
    const migration = migrateCriteria(criteria({ version: CRITERIA_VERSION + 1 }));
    expect(migration.status).toBe('stale');
  });
});
