import { describe, expect, it } from 'vitest';

import { clocksDiffer, dayShift, venueClock, wallClockAt } from './venue-clock.js';

/**
 * INVARIANT PROTEGE
 *   Une date programmee dans six mois s'affiche a la BONNE heure — y compris
 *   de l'autre cote d'un changement d'heure.
 *
 * POURQUOI CE TEST EXISTE
 *   C'est le cas qui a fait echouer D3. `shared/catalogue.json` stocke
 *   `venue.utcOffsetMin`, un decalage FIGE, et `helpers.js` en deduit
 *   l'abreviation d'ete ou d'hiver en le comparant a une table. La regle est
 *   juste, la forme ne survit pas : un decalage fixe ne passe pas un
 *   changement d'heure.
 *
 *   Le decalage est donc SERVI, recalcule par le serveur pour l'instant
 *   concerne — ce que ce module verifie en refusant tout ce qui n'est pas un
 *   identifiant IANA.
 */
describe('le fuseau est un identifiant IANA, pas un decalage', () => {
  it('refuse une abreviation et un decalage — les deux formes que D3 remplace', () => {
    expect(() => venueClock('Europe/Paris', 120)).not.toThrow();
    expect(() => venueClock('CEST', 120)).toThrow();
    expect(() => venueClock('+02:00', 120)).toThrow();
    expect(() => venueClock('Europe/Paris', 17 * 60)).toThrow();
  });

  it('accepte les formes IANA reelles du catalogue', () => {
    for (const zone of ['Europe/Paris', 'America/New_York', 'Europe/Zurich', 'America/Argentina/Buenos_Aires']) {
      expect(() => venueClock(zone, 60)).not.toThrow();
    }
  });

  it('porte DEUX decalages pour la meme salle, selon la saison', () => {
    // La meme salle, deux instants, deux decalages servis. C'est precisement ce
    // qu'un champ fige ne peut pas exprimer.
    const summer = venueClock('Europe/Paris', 120);
    const winter = venueClock('Europe/Paris', 60);

    expect(summer.timeZone).toBe(winter.timeZone);
    expect(summer.utcOffsetMinutes).not.toBe(winter.utcOffsetMinutes);
  });
});

/**
 * INVARIANT PROTEGE
 *   « L'heure du spectateur d'abord, l'heure de salle en second quand elle
 *   differe » — avec le suffixe « la veille » / « le lendemain » quand le
 *   passage d'une horloge a l'autre change de jour.
 *
 * POURQUOI
 *   E7 : la maquette TV lit `fixtures.geography.viewerUtcOffsetMin`, qui
 *   N'EXISTE NULLE PART. Il vaut `undefined`, donc « l'heure a la salle » est
 *   calculee contre UTC, pas contre le spectateur. Le decalage du spectateur
 *   est donc un ARGUMENT, jamais un global.
 */
describe('les deux horloges', () => {
  it('detecte le passage au lendemain', () => {
    // 23 h 30 a Paris en ete (UTC+2) = 21 h 30 UTC. Un spectateur a Los Angeles
    // (UTC-7) est alors au 14 h 30 du MEME jour : la salle est « le lendemain ».
    const instant = '2026-06-15T21:30:00.000Z';
    const paris = venueClock('Europe/Paris', 120);

    expect(dayShift(instant, paris, -420)).toBe(0);

    // A 23 h 30 UTC, Paris est au 16 juin, Los Angeles encore au 15.
    expect(dayShift('2026-06-15T23:30:00.000Z', paris, -420)).toBe(1);
  });

  it('detecte la veille', () => {
    // 00 h 30 a Paris en ete = 22 h 30 UTC la veille. Un spectateur a Tokyo
    // (UTC+9) est deja au lendemain : la salle est « la veille ».
    const paris = venueClock('Europe/Paris', 120);
    expect(dayShift('2026-06-15T22:30:00.000Z', paris, 540)).toBe(-1);
  });

  it('ne signale aucune difference quand les deux horloges coincident', () => {
    const paris = venueClock('Europe/Paris', 120);
    expect(clocksDiffer(paris, 120)).toBe(false);
    expect(clocksDiffer(paris, 60)).toBe(true);
    expect(dayShift('2026-06-15T19:00:00.000Z', paris, 120)).toBe(0);
  });

  it("rend des composantes murales en nombres, jamais une chaine formatee", () => {
    // Le formatage est de la presentation : il depend de la locale et vit
    // ailleurs. Ce module rend des nombres.
    const wall = wallClockAt('2026-06-15T19:04:00.000Z', 120);
    expect(wall).toEqual({ year: 2026, month: 6, day: 15, hour: 21, minute: 4 });
  });
});
