import { describe, expect, it } from 'vitest';

import { FixedClock, SystemClock } from './clock.js';

/**
 * INVARIANT PROTEGE
 *   Aucune regle ne lit l'heure de la machine. L'horloge est un PORT.
 *
 * POURQUOI
 *   Un test qui passe a 23 h 59 et echoue a 00 h 01 a trouve un `Date.now()`
 *   oublie. Et un paquet importe par sept services ne peut pas porter d'etat
 *   global : deux requetes concurrentes partageraient la meme horloge.
 */
describe("l'horloge est injectable", () => {
  it('rend un instant ISO 8601 UTC, jamais un decalage en minutes', () => {
    const clock = new FixedClock('2026-09-21T20:30:00.000Z');
    expect(clock.now()).toBe('2026-09-21T20:30:00.000Z');
    expect(clock.now()).toMatch(/Z$/);
  });

  it('est deterministe — deux lectures rendent le meme instant', () => {
    const clock = new FixedClock('2026-09-21T20:30:00.000Z');
    expect(clock.now()).toBe(clock.now());
  });

  it("avance a la demande, pour les tests de fenetre", () => {
    const clock = new FixedClock('2026-09-21T20:30:00.000Z');
    clock.advance(90 * 1000);
    expect(clock.now()).toBe('2026-09-21T20:31:30.000Z');
  });

  it("accepte un instant en millisecondes, pour le jeu deterministe", () => {
    const clock = new FixedClock(0);
    expect(clock.now()).toBe('1970-01-01T00:00:00.000Z');
    expect(clock.nowMs()).toBe(0);
  });

  it("l'horloge systeme est la seule a lire la machine", () => {
    const clock = new SystemClock();
    expect(clock.now()).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);
    expect(Math.abs(clock.nowMs() - Date.now())).toBeLessThan(1000);
  });
});
