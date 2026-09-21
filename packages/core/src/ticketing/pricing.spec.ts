import { describe, expect, it } from 'vitest';

import { money } from '../money/money.js';
import { PriceTier, PromotionReason } from '../vocabulary/commerce.js';
import { applyBestDiscount, lateRatePrice, lowestActivePrice, quoteSeats, type TierPrice } from './pricing.js';

const eur = (amountMinor: number) => money(amountMinor, 'EUR');
const fee = { perSeat: eur(150), rateBps: 0 };

/**
 * INVARIANT PROTEGE
 *   La remise d'abonnement et la promotion NE SE CUMULENT PAS : la plus
 *   favorable au spectateur s'applique.
 *
 * POURQUOI CE TEST EXISTE
 *   `storefront-web` Q12 : trois ecrans affichent un prix remise. Si la regle
 *   de cumul n'est pas dans le domaine, elle sera ecrite trois fois. Et le
 *   cumul produirait un PRIX NEGATIF sur une avant-premiere a tarif de
 *   decouverte pour un abonne `premium` — c'est le cas qui tranche.
 */
describe('remise et promotion', () => {
  it('retient la promotion quand elle est plus favorable', () => {
    // 26 € remise a 20 % = 20,80 € ; la promotion est a 15 €.
    expect(applyBestDiscount(eur(2600), 2000, eur(1500)).amountMinor).toBe(1500);
  });

  it("retient la remise quand c'est elle qui l'emporte", () => {
    // 26 € remise a 20 % = 20,80 € ; la promotion est a 24 €.
    expect(applyBestDiscount(eur(2600), 2000, eur(2400)).amountMinor).toBe(2080);
  });

  it('ne CUMULE jamais — le cas qui donnerait un prix negatif', () => {
    // Avant-premiere a tarif de decouverte (5 €) pour un abonne premium (20 %).
    // Le cumul donnerait 5 − 5,20 = −0,20 €.
    const result = applyBestDiscount(eur(2600), 2000, eur(500));
    expect(result.amountMinor).toBe(500);
    expect(result.amountMinor).toBeGreaterThan(0);
  });

  it("refuse de comparer deux devises plutot que de convertir en silence", () => {
    expect(() => applyBestDiscount(eur(2600), 2000, money(1500, 'CHF'))).toThrow();
  });
});

/**
 * INVARIANT PROTEGE
 *   L'arrondi a lieu sur le prix UNITAIRE ; la multiplication qui suit est
 *   exacte.
 *
 * POURQUOI
 *   C'est « arrondi sur chaque composante prise separement » applique a un cas
 *   ou ce n'est pas evident a l'oeil. Remiser le total puis arrondir produit un
 *   centime d'ecart par commande, toujours dans le meme sens.
 */
describe('le recapitulatif, ligne par ligne', () => {
  it('porte les quatre lignes, et elles se referment', () => {
    const quote = quoteSeats(eur(2600), 3, 1000, null, fee);
    expect(quote.tierTotal.amountMinor).toBe(7800);
    expect(quote.discount.amountMinor).toBe(780); // 260 x 3, arrondi a l'unite
    expect(quote.serviceFee.amountMinor).toBe(450); // 150 x 3
    expect(quote.total.amountMinor).toBe(7800 - 780 + 450);
  });

  it('arrondit le prix unitaire, pas le total', () => {
    // 26,37 € remise a 12 % : l'unitaire remise est 2637 − round(316,44) = 2321.
    // Trois places : 6963. Remiser le TOTAL donnerait 7911 − round(949,32) = 6962.
    const quote = quoteSeats(eur(2637), 3, 1200, null, fee);
    expect(quote.tierTotal.amountMinor - quote.discount.amountMinor).toBe(6963);
  });

  it('refuse une quantite absurde', () => {
    expect(() => quoteSeats(eur(2600), 0, 0, null, fee)).toThrow();
  });
});

/**
 * INVARIANT PROTEGE
 *   Le tarif « seance commencee » depend de l'INSTANT, donc il se recalcule —
 *   il n'est jamais une chaine figee.
 */
describe('le tarif au prorata', () => {
  it('decroit avec la progression du direct', () => {
    expect(lateRatePrice(eur(2600), 0).amountMinor).toBe(2600);
    expect(lateRatePrice(eur(2600), 0.5).amountMinor).toBe(1300);
    expect(lateRatePrice(eur(2600), 1).amountMinor).toBe(0);
  });

  it('borne la progression plutot que de rendre un prix negatif', () => {
    expect(lateRatePrice(eur(2600), 1.4).amountMinor).toBe(0);
    expect(lateRatePrice(eur(2600), -0.2).amountMinor).toBe(2600);
  });
});

describe('le tarif d\'appel', () => {
  it('ignore les paliers inactifs', () => {
    const tiers: readonly TierPrice[] = [
      { tier: PriceTier.FULL, amount: eur(2600), active: true },
      { tier: PriceTier.REDUCED, amount: eur(1800), active: false },
      { tier: PriceTier.SUPPORT, amount: eur(4500), active: true },
    ];
    expect(lowestActivePrice(tiers)?.amountMinor).toBe(2600);
  });

  it('rend null quand aucun palier n\'est actif — jamais zero', () => {
    // Un tarif d'appel a zero serait lu « gratuit ». L'absence de tarif et un
    // tarif nul ne sont pas la meme chose.
    expect(lowestActivePrice([])).toBeNull();
  });
});

describe('les motifs de promotion', () => {
  it('porte les cinq motifs releves dans la conception', () => {
    expect(Object.values(PromotionReason)).toHaveLength(5);
  });
});
