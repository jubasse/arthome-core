/**
 * L'ARRONDI — l'invariant le plus cite du projet, et celui qui se trompe le
 * plus discretement.
 *
 * `shared/` le porte et il fait autorite : « l'arrondi se fait A L'UNITE sur
 * CHAQUE COMPOSANTE PRISE SEPAREMENT ». Ce n'est pas un detail de presentation :
 *
 *   la somme des arrondis n'est pas l'arrondi de la somme.
 *
 * Trois places a 26,33 € : 3 x round(2633 x 0,12) = 3 x 316 = 948, quand
 * round(3 x 2633 x 0,12) = round(947,88) = 948 — ici ils coincident. A
 * 26,37 € : 3 x round(2637 x 0,12) = 3 x 316 = 948, contre round(949,32) = 949.
 * Un centime, sur chaque commande, dans le sens de la plateforme. C'est
 * exactement le genre d'ecart qu'une reconciliation Stripe fait apparaitre six
 * mois plus tard sans qu'on sache d'ou il vient.
 */

import { DomainError } from '../kernel/errors.js';
import { money, type Money } from './money.js';

/**
 * Les taux voyagent en POINTS DE BASE, entiers : 1200 = 12 %, 550 = 5,5 %.
 *
 * Jamais en virgule flottante. `0.12` semble innocent jusqu'a ce que
 * `2633 * 0.12` rende 315,95999999999998 et qu'un arrondi bascule du mauvais
 * cote. Un taux est une donnee exacte : il se porte en entier.
 */
export type BasisPoints = number;

export const BASIS_POINTS_SCALE = 10_000;

export function basisPoints(value: number): BasisPoints {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new DomainError({ code: 'rate.invalid', params: { rate: String(value) } });
  }
  return value;
}

/**
 * Arrondi au plus proche, a l'unite mineure, moities vers le haut en valeur
 * absolue (« half away from zero »).
 *
 * Pourquoi pas `Math.round` : il arrondit -0,5 vers 0 et 0,5 vers 1, donc il
 * est ASYMETRIQUE sur les negatifs — et les negatifs existent ici, ce sont les
 * remboursements et les avoirs. Un remboursement de 2,505 € et un paiement de
 * 2,505 € doivent produire le meme centime, au signe pres, sinon un aller-retour
 * ne revient pas a zero.
 */
export function roundMinor(value: number): number {
  const rounded = value < 0 ? -Math.round(-value) : Math.round(value);
  if (!Number.isSafeInteger(rounded)) {
    throw new DomainError({ code: 'money.amount_not_integer', params: { amount: String(value) } });
  }
  return rounded;
}

/**
 * Applique un taux a un montant, et arrondit — LA composante elementaire.
 *
 * Toute regle qui applique un taux passe par ici : commission, TVA, remise,
 * prorata. C'est ce qui garantit que l'arrondi se fait une seule fois, au meme
 * endroit, dans le meme sens.
 */
export function applyRate(value: Money, rate: BasisPoints): Money {
  return money(roundMinor((value.amountMinor * rate) / BASIS_POINTS_SCALE), value.currencyCode);
}

/**
 * Le complement : ce qui reste apres avoir applique un taux.
 *
 * `remainderAfterRate(x, r)` vaut `x - applyRate(x, r)` EXACTEMENT, jamais
 * `applyRate(x, 10000 - r)` — les deux different d'un centime des que
 * l'arrondi tombe sur une moitie, et c'est la difference entre un net juste et
 * un net qui derive.
 */
export function remainderAfterRate(value: Money, rate: BasisPoints): Money {
  return money(value.amountMinor - applyRate(value, rate).amountMinor, value.currencyCode);
}

/**
 * Extrait la part de taxe d'un montant TTC.
 *
 * Le prix affiche a un consommateur est TTC (convention B2C) : la TVA s'en
 * EXTRAIT, elle ne s'y ajoute pas. `ttc x rate / (10000 + rate)`, et non
 * `ttc x rate / 10000` — l'erreur classique, qui surestime la taxe de
 * `rate/(10000+rate)` et fait un ecart de 5 % sur un taux a 5,5 %.
 */
export function taxIncludedIn(grossTtc: Money, rate: BasisPoints): Money {
  return money(
    roundMinor((grossTtc.amountMinor * rate) / (BASIS_POINTS_SCALE + rate)),
    grossTtc.currencyCode,
  );
}
