import { describe, expect, it } from 'vitest';

import { BlackoutReason, RightsScope } from '../vocabulary/catalog.js';
import { blackoutReasonOf, isAvailableIn, restrictedRights, worldwideRights } from './rights.js';

/**
 * INVARIANT PROTEGE
 *   Une diffusion est MONDIALE PAR DEFAUT ; une restriction territoriale est
 *   l'exception, et elle se justifie par un motif CODE.
 *
 * POURQUOI CE TEST EXISTE
 *   `geography.rightsPolicy.note` le pose, et c'est l'inverse de la VOD : du
 *   spectacle vivant se diffuse partout sauf clause contraire. Une surface qui
 *   inverserait le defaut bloquerait tout le catalogue sans que personne
 *   comprenne pourquoi.
 *
 *   Et E8 : `blackoutReasons[]` porte `label` et `labelEn` — du texte REDIGE
 *   DANS LA DONNEE — alors que tout le reste passe par `enums.*`. C'est une
 *   fuite d'i18n dans le modele, exactement du genre que « i18n par codes »
 *   existe pour interdire.
 */
describe('les droits territoriaux', () => {
  it('ouvre partout par defaut', () => {
    const rights = worldwideRights();
    expect(rights.scope).toBe(RightsScope.WORLDWIDE);
    for (const country of ['FR', 'BE', 'CH', 'CA', 'JP']) {
      expect(isAvailableIn(rights, country)).toBe(true);
    }
  });

  it('ne bloque que les territoires declares', () => {
    const rights = restrictedRights(['BE', 'CH'], BlackoutReason.CO_PRODUCTION);
    expect(isAvailableIn(rights, 'BE')).toBe(false);
    expect(isAvailableIn(rights, 'CH')).toBe(false);
    expect(isAvailableIn(rights, 'FR')).toBe(true);
    expect(isAvailableIn(rights, 'CA')).toBe(true);
  });

  it('compare sans se soucier de la casse du pays servi', () => {
    const rights = restrictedRights(['BE'], BlackoutReason.BROADCASTER);
    expect(isAvailableIn(rights, 'be')).toBe(false);
  });

  it('rend un CODE, jamais une phrase', () => {
    const rights = restrictedRights(['BE'], BlackoutReason.FESTIVAL);
    expect(blackoutReasonOf(rights, 'BE')).toBe('festival');
    // Et l'orthographe est celle de `shared/`, a la lettre : kebab-case (K6).
    expect(BlackoutReason.CO_PRODUCTION).toBe('co-production');
  });

  it('ne donne aucun motif a qui n\'est pas bloque', () => {
    // L'absence de motif EST la disponibilite : pas de second appel pour
    // savoir pourquoi ca marche.
    const rights = restrictedRights(['BE'], BlackoutReason.FESTIVAL);
    expect(blackoutReasonOf(rights, 'FR')).toBeNull();
    expect(blackoutReasonOf(worldwideRights(), 'BE')).toBeNull();
  });
});
