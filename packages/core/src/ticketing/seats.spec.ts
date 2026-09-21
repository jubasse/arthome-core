import { describe, expect, it } from 'vitest';

import {
  assertTierWidens,
  availabilityOf,
  checkoutIntentExpiry,
  holdFor,
  isHoldExpired,
  isScarce,
  seatsAvailable,
  tvPairingIntentExpiry,
  type Gauge,
} from './seats.js';

const gauge = (over: Partial<Gauge> = {}): Gauge => ({
  capacityTotal: 100,
  seatsSold: 0,
  seatsHeld: 0,
  waitlistCount: 0,
  ...over,
});

/**
 * INVARIANT PROTEGE
 *   `SeatHold.expiresAt` est le MEME INSTANT que l'expiration de l'intention
 *   d'achat qui l'a creee. Un seul instant, porte par deux objets, jamais deux
 *   durees qui derivent.
 *
 * POURQUOI CE TEST EXISTE
 *   Remontee par `auth` : la duree d'un appairage `seat` doit etre la duree
 *   d'un hold, sinon la jauge affichee sur la TV est fausse pendant toute
 *   l'attente du telephone. La TV montre « 12 places », le spectateur part
 *   chercher son telephone, et pendant cinq minutes rien ne garantit qu'elles
 *   existent encore.
 */
describe('la reservation de jauge', () => {
  it("prend l'instant d'expiration de l'intention, pas une duree a elle", () => {
    // La signature IMPOSE l'invariant : on ne passe pas une duree, on passe
    // l'instant d'expiration de l'intention. Il n'y a rien a synchroniser.
    const intentExpiry = tvPairingIntentExpiry('2026-09-21T18:00:00.000Z');
    const hold = holdFor(2, intentExpiry);
    expect(hold.expiresAt).toBe(intentExpiry);
  });

  it('donne cinq minutes a un appairage TV et quinze a un paiement direct', () => {
    // Le choix de cinq minutes se JUSTIFIE ici : une duree d'appairage est un
    // engagement de jauge, et quinze minutes par spectateur hesitant videraient
    // une salle populaire sans qu'une seule place soit vendue.
    expect(tvPairingIntentExpiry('2026-09-21T18:00:00.000Z')).toBe('2026-09-21T18:05:00.000Z');
    expect(checkoutIntentExpiry('2026-09-21T18:00:00.000Z')).toBe('2026-09-21T18:15:00.000Z');
  });

  it('retire les places retenues de la disponibilite servie', () => {
    // Sans ce retrait, deux spectateurs achetent la derniere place.
    expect(seatsAvailable(gauge({ seatsSold: 98, seatsHeld: 2 }))).toBe(0);
    expect(seatsAvailable(gauge({ seatsSold: 98, seatsHeld: 1 }))).toBe(1);
  });

  it('libere la jauge a la seconde ou l\'intention expire', () => {
    const hold = holdFor(1, '2026-09-21T18:05:00.000Z');
    expect(isHoldExpired(hold, '2026-09-21T18:04:59.000Z')).toBe(false);
    expect(isHoldExpired(hold, '2026-09-21T18:05:00.000Z')).toBe(true);
  });

  it('refuse une quantite absurde plutot que de la retenir', () => {
    expect(() => holdFor(0, '2026-09-21T18:05:00.000Z')).toThrow();
    expect(() => holdFor(-1, '2026-09-21T18:05:00.000Z')).toThrow();
  });
});

/**
 * INVARIANT PROTEGE
 *   Un palier ELARGIT la jauge, jamais ne la reduit apres la mise en vente.
 *
 * POURQUOI
 *   Une reduction apres mise en vente annulerait des places deja vendues.
 */
describe('les paliers de jauge', () => {
  it('refuse une reduction', () => {
    expect(() => assertTierWidens(500, 800)).not.toThrow();
    expect(() => assertTierWidens(500, 500)).toThrow();
    expect(() => assertTierWidens(500, 300)).toThrow();
  });
});

/**
 * INVARIANT PROTEGE
 *   L'etat de la jauge est un ETAT, jamais une phrase.
 *
 * POURQUOI
 *   `helpers.seatsLabel` rendait « 86 places » ou « Complet ». Une phrase ne se
 *   filtre pas, ne se trie pas, ne se traduit pas — et fait fuir l'i18n.
 */
describe('la disponibilite', () => {
  it('distingue disponible, liste d\'attente seule, et complet', () => {
    expect(availabilityOf(gauge({ seatsSold: 14 }))).toEqual({
      kind: 'seats-available',
      seatsAvailable: 86,
    });
    expect(availabilityOf(gauge({ seatsSold: 100, waitlistCount: 340 }))).toEqual({
      kind: 'waitlist-only',
      waitlistCount: 340,
    });
    expect(availabilityOf(gauge({ seatsSold: 100 }))).toEqual({ kind: 'sold-out' });
  });

  it('cesse d\'etre « bientot complet » quand il n\'y a plus rien', () => {
    // « Bientot complet » sur une date complete serait un mensonge poli.
    expect(isScarce(gauge({ seatsSold: 90 }))).toBe(true);
    expect(isScarce(gauge({ seatsSold: 100 }))).toBe(false);
    expect(isScarce(gauge({ seatsSold: 84 }))).toBe(false);
  });
});
