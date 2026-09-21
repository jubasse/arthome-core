import { describe, expect, it } from 'vitest';

import { money } from './money.js';
import { applyRate, remainderAfterRate, roundMinor, taxIncludedIn } from './rounding.js';

const eur = (amountMinor: number) => money(amountMinor, 'EUR');

/**
 * INVARIANT PROTEGE
 *   L'arrondi se fait A L'UNITE MINEURE, sur CHAQUE COMPOSANTE PRISE
 *   SEPAREMENT. C'est ce que `shared/` porte et qui fait autorite.
 *
 * POURQUOI CE TEST EXISTE
 *   La somme des arrondis n'est pas l'arrondi de la somme. L'ecart est d'un
 *   centime, toujours dans le meme sens, sur chaque commande — c'est
 *   exactement le genre d'ecart qu'une reconciliation Stripe fait apparaitre
 *   six mois plus tard sans qu'on sache d'ou il vient.
 */
describe("l'arrondi, composante par composante", () => {
  it("n'est PAS l'arrondi de la somme", () => {
    const unitPrice = eur(2637);
    const commissionRate = 1200; // 12 %

    const perSeat = applyRate(unitPrice, commissionRate).amountMinor; // round(316,44) = 316
    const threeSeatsSeparately = perSeat * 3; // 948
    const threeSeatsTogether = applyRate(eur(2637 * 3), commissionRate).amountMinor; // round(949,32) = 949

    expect(perSeat).toBe(316);
    expect(threeSeatsSeparately).toBe(948);
    expect(threeSeatsTogether).toBe(949);
    // Le test ne dit pas laquelle est « juste » : il dit qu'elles DIFFERENT,
    // donc que l'ordre des operations est une decision, pas un detail.
    expect(threeSeatsSeparately).not.toBe(threeSeatsTogether);
  });

  it('est symetrique sur les negatifs — un remboursement rend le meme centime', () => {
    // `Math.round` arrondit -0,5 vers 0 et 0,5 vers 1 : il est ASYMETRIQUE.
    // Les negatifs existent ici — ce sont les remboursements et les avoirs —
    // et un aller-retour doit revenir exactement a zero.
    expect(roundMinor(2.5)).toBe(3);
    expect(roundMinor(-2.5)).toBe(-3);
    expect(roundMinor(2.5) + roundMinor(-2.5)).toBe(0);
    expect(Math.round(-2.5)).toBe(-2); // ce que le naif aurait donne
  });

  it('ne produit jamais de monnaie : taux + complement = total', () => {
    // L'invariant qui protege l'avoir : `remainderAfterRate` est defini comme
    // une SOUSTRACTION, jamais comme `applyRate(x, 10000 - r)`.
    for (const amount of [2637, 1, 99, 100, 12_345, 7]) {
      const value = eur(amount);
      const part = applyRate(value, 1200);
      const rest = remainderAfterRate(value, 1200);
      expect(part.amountMinor + rest.amountMinor).toBe(amount);
    }
  });

  it("montre que le complement naif derive d'un centime", () => {
    const value = eur(2637);
    const naive = applyRate(value, 10_000 - 1200).amountMinor; // round(2320,56) = 2321
    const exact = remainderAfterRate(value, 1200).amountMinor; // 2637 - 316 = 2321
    // Ils coincident ici ; sur 2633 ils ne coincident pas.
    expect(naive).toBe(exact);

    const other = eur(2633);
    expect(applyRate(other, 10_000 - 1200).amountMinor).toBe(2317);
    expect(remainderAfterRate(other, 1200).amountMinor).toBe(2317);
  });
});

/**
 * INVARIANT PROTEGE
 *   Le prix affiche a un consommateur est TTC : la TVA s'en EXTRAIT, elle ne
 *   s'y ajoute pas.
 *
 * POURQUOI
 *   L'erreur classique est `ttc x taux / 10000`, qui SURESTIME la taxe. Sur un
 *   taux a 5,5 % l'ecart est de 5 % du montant de TVA — invisible a l'oeil,
 *   systematique a la declaration.
 */
describe("la TVA s'extrait d'un TTC", () => {
  it("n'est pas le taux applique au TTC", () => {
    const grossTtc = eur(2600);
    const rate = 550; // 5,5 %

    const extracted = taxIncludedIn(grossTtc, rate).amountMinor; // 2600 x 550 / 10550
    const naive = applyRate(grossTtc, rate).amountMinor; // 2600 x 550 / 10000

    expect(extracted).toBe(136);
    expect(naive).toBe(143);
    expect(extracted).toBeLessThan(naive);
  });

  it('laisse un HT qui, retaxe, redonne le TTC', () => {
    const grossTtc = eur(2600);
    const vat = taxIncludedIn(grossTtc, 550);
    const ht = grossTtc.amountMinor - vat.amountMinor;

    expect(ht + vat.amountMinor).toBe(grossTtc.amountMinor);
  });
});

/**
 * INVARIANT PROTEGE
 *   Additionner deux devises differentes est une FAUTE, jamais une conversion
 *   implicite. D4 : trois marches declares, un seul exerce — le multi-devise
 *   est une intention, pas une regle eprouvee.
 */
describe('les devises ne se melangent pas', () => {
  it('refuse une addition entre deux devises', () => {
    expect(() => applyRate(money(1000, 'CHF'), 1200)).not.toThrow();
    expect(() => money(1000, 'eur')).toThrow(); // minuscules refusees
    expect(() => money(10.5, 'EUR')).toThrow(); // unite mineure entiere
  });
});
