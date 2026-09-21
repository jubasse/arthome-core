import { describe, expect, it } from 'vitest';

import { FixedClock } from '../kernel/clock.js';
import { displayStateOf } from '../catalog/date-state.js';
import { DisplayState } from '../vocabulary/catalog.js';
import { replayHoursLeft } from '../replay/index.js';
import { buildFixtures, fixtureDate } from './index.js';
import { DeterministicRandom } from './random.js';

const clock = (): FixedClock => new FixedClock('2026-09-21T20:00:00.000Z');

/**
 * INVARIANT PROTEGE
 *   Le jeu de donnees est DETERMINISTE : meme graine, meme horloge, meme jeu.
 *
 * POURQUOI
 *   Un jeu non reproductible rend un test intermittent, et un test
 *   intermittent finit par etre desactive. C'est aussi ce qui permet au
 *   `FakePaymentAdapter` de tourner sans cle et sans reseau, ce que la
 *   demonstration publique exige.
 */
describe('le determinisme', () => {
  it('produit exactement le meme jeu a graine et horloge egales', () => {
    expect(buildFixtures(42, clock())).toEqual(buildFixtures(42, clock()));
  });

  it('produit une suite reproductible', () => {
    const first = new DeterministicRandom(7);
    const second = new DeterministicRandom(7);
    const draw = (r: DeterministicRandom): readonly number[] => [r.next(), r.next(), r.next()];
    expect(draw(first)).toEqual(draw(second));
  });

  it('ne rend jamais `undefined` sur une liste vide', () => {
    // `noUncheckedIndexedAccess` rend ce cas visible ; la signature le rend sur.
    expect(new DeterministicRandom(1).pick([])).toBeNull();
  });
});

/**
 * INVARIANT PROTEGE
 *   Le jeu couvre LES CAS QUI FONT MAL, pas un volume de donnees plausibles.
 *
 * POURQUOI
 *   Un volume plausible ne prouve rien. Une issue de chaque nature, une fenetre
 *   sur le point d'expirer et un blackout territorial prouvent quelque chose —
 *   et chaque cas porte la raison de son existence dans `covers`, lisible dans
 *   un echec de test.
 */
describe('la couverture du jeu', () => {
  const fixtures = buildFixtures(42, clock());

  it('exerce les trois issues', () => {
    for (const id of ['date:cancelled', 'date:postponed', 'date:interrupted']) {
      expect(fixtureDate(fixtures, id)?.outcome).not.toBeNull();
    }
  });

  it('porte le cas des trois axes en contradiction', () => {
    // La course de consommation Kafka, materialisee : publication `live`,
    // antenne `on-air`, ET une issue declaree. L'issue doit gagner.
    const date = fixtureDate(fixtures, 'date:absurd-race');
    expect(date).not.toBeNull();
    if (date === null) return;

    const display = displayStateOf({
      publicationState: date.publicationState,
      runState: date.runState,
      outcome: date.outcome,
      timing: date.timing,
      now: fixtures.generatedAt,
    });
    expect(display.state).toBe(DisplayState.CANCELLED);
  });

  it("porte une fenetre de rediffusion qui expire dans l'heure", () => {
    const date = fixtureDate(fixtures, 'date:replay-expiring');
    expect(date).not.toBeNull();
    if (date === null) return;
    expect(replayHoursLeft(date.timing, fixtures.generatedAt)).toBe(1);
  });

  it('porte des places retenues par une intention en cours', () => {
    // Le cas qui n'existait nulle part avant `SeatHold`.
    expect(fixtureDate(fixtures, 'date:room-open')?.gauge.seatsHeld).toBeGreaterThan(0);
  });

  it('donne a chaque cas la raison de son existence', () => {
    for (const date of fixtures.dates) {
      expect(date.covers.length).toBeGreaterThan(10);
    }
  });
});
