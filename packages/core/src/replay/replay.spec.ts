import { describe, expect, it } from 'vitest';

import type { DateTiming } from '../catalog/date-state.js';
import { ReplayPolicy } from '../vocabulary/catalog.js';
import {
  ReplayUnavailabilityReason,
  isReplayWindowOpen,
  replayHoursLeft,
  replayUnavailabilityReason,
} from './index.js';

const timing: DateTiming = {
  startsAt: '2026-09-21T19:00:00.000Z',
  runtimeMin: 120,
  roomOpensBeforeMin: 30,
  replayPolicy: ReplayPolicy.INCLUDED,
  replayWindowHours: 48,
};

/**
 * INVARIANT PROTEGE
 *   La fenetre de rediffusion court depuis la FIN du direct, jamais depuis le
 *   debut. Et les heures restantes se DERIVENT : le contrat livre les entrees,
 *   pas le resultat.
 *
 * POURQUOI
 *   `storefront-tv` : « si le serveur livrait le nombre d'heures, il serait
 *   faux des la minute suivante ». C'est l'exemple canonique de la regle
 *   « aucune valeur calculee deux fois » — et de sa resolution : une regle, un
 *   `now` explicite, deux sites d'appel.
 */
describe('la fenetre de rediffusion', () => {
  it('court depuis la fin du direct, pas depuis le debut', () => {
    // Fin a 21 h + 48 h = 23 septembre 21 h. Depuis le DEBUT, ce serait 19 h.
    expect(replayHoursLeft(timing, '2026-09-23T20:00:00.000Z')).toBe(1);
    expect(replayHoursLeft(timing, '2026-09-23T21:00:00.000Z')).toBe(0);
  });

  it('arrondit AU-DESSUS, pour ne jamais promettre moins qu\'il ne reste', () => {
    // Il reste 30 minutes : annoncer « 0 h » serait faux et decourageant.
    expect(replayHoursLeft(timing, '2026-09-23T20:30:00.000Z')).toBe(1);
  });

  it('ne rend jamais un nombre negatif', () => {
    expect(replayHoursLeft(timing, '2026-10-01T00:00:00.000Z')).toBe(0);
  });

  it('rend zero quand la politique interdit la rediffusion', () => {
    const none: DateTiming = { ...timing, replayPolicy: ReplayPolicy.NONE, replayWindowHours: 0 };
    expect(replayHoursLeft(none, '2026-09-21T22:00:00.000Z')).toBe(0);
    expect(isReplayWindowOpen(none, '2026-09-21T22:00:00.000Z')).toBe(false);
  });

  it('traverse un changement d\'heure sans se decaler', () => {
    // Une fenetre de 200 h — la plus longue du jeu de donnees — posee sur le
    // dernier week-end d'octobre. Le calcul est en INSTANTS, donc il est
    // insensible au changement d'heure : c'est precisement ce qu'un decalage
    // fige ne garantissait pas (D3).
    const long: DateTiming = {
      ...timing,
      startsAt: '2026-10-23T19:00:00.000Z',
      replayWindowHours: 200,
    };
    // Fin 23 oct. 21 h + 200 h = 1er nov. 05 h UTC, quel que soit le fuseau.
    expect(replayHoursLeft(long, '2026-11-01T04:00:00.000Z')).toBe(1);
    expect(replayHoursLeft(long, '2026-11-01T05:00:00.000Z')).toBe(0);
  });
});

/**
 * INVARIANT PROTEGE
 *   « Aucune rediffusion pour cette date » et « rediffusion expiree » sont DEUX
 *   refus distincts.
 *
 * POURQUOI
 *   `storefront-tv` les liste separement dans les codes d'erreur qu'il doit
 *   savoir distinguer : chacun produit un ecran different, et un code generique
 *   en produirait un faux.
 */
describe('les deux refus de rediffusion', () => {
  it('distingue une politique absente d\'une fenetre fermee', () => {
    const none: DateTiming = { ...timing, replayPolicy: ReplayPolicy.NONE, replayWindowHours: 0 };
    expect(replayUnavailabilityReason(none, '2026-09-21T22:00:00.000Z')).toBe(
      ReplayUnavailabilityReason.NO_POLICY,
    );
    expect(replayUnavailabilityReason(timing, '2026-10-01T00:00:00.000Z')).toBe(
      ReplayUnavailabilityReason.WINDOW_EXPIRED,
    );
  });

  it("rend null quand elle est disponible — l'absence de motif EST la disponibilite", () => {
    expect(replayUnavailabilityReason(timing, '2026-09-22T10:00:00.000Z')).toBeNull();
  });
});
