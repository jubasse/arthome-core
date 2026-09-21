/**
 * Le VERSEMENT — commission, TVA par juridiction, net, retenue.
 *
 * ⚠ D5 EST LE PIEGE LE PLUS COUTEUX DU DOSSIER, et il faut le dire avant tout
 * le reste. `fixtures.js:1297-1324` calcule :
 *
 *     commission = round(gross x 0,12)
 *     vat        = round(gross x vatRate)     ← un taux UNIQUE, sur le BRUT
 *     net        = gross − commission − vat
 *
 * Cela RESSEMBLE a une regle metier eprouvee — meme place, meme ton, meme
 * precision a l'euro. Ce n'en est pas une : elle produit un nombre plausible
 * pour une maquette et ne repond a AUCUNE des trois questions fiscales — qui
 * doit la TVA, sur quelle assiette, qui en est redevable.
 *
 * Ce qui fait autorite dans `shared/` et qui est porte tel quel :
 *   commission 12 % · delai 14 jours · arrondi a l'unite sur CHAQUE composante
 *   prise separement · retenue tant qu'une issue est ouverte.
 *
 * Le modele retenu (D-015) : COMMISSIONNAIRE — Arthome agit en son nom propre,
 * l'assiette de la TVA est le billet entier, le taux est celui du pays du
 * spectateur, le redevable est Arthome. **Et la commission porte sur le HT**,
 * parce que sur le TTC les 12 % annonces aux artistes varieraient avec le pays
 * de l'acheteur.
 *
 * ⚠ La validation juridique n'est PAS faite : voir l'avertissement en tete
 * d'`adr-payments.md`. Ce module calcule ; il ne tranche pas une question de
 * droit.
 */

import type { Instant } from '../kernel/clock.js';
import { DAY_MS, fromEpochMs, toEpochMs } from '../time/instant.js';
import { money, subtract, sum, type Money } from '../money/money.js';
import { applyRate, basisPoints, taxIncludedIn, type BasisPoints } from '../money/rounding.js';
import type { DateOutcome } from '../vocabulary/catalog.js';
import { DateOutcome as Outcome } from '../vocabulary/catalog.js';
import { PayoutState, TaxJurisdictionLevel, TaxSupplyKind } from '../vocabulary/commerce.js';

/** `commissionRate: 0.12` de `catalogue.json`, en points de base. */
export const COMMISSION_RATE_BPS: BasisPoints = basisPoints(1_200);
/** `payoutDelayDays: 14`. */
export const PAYOUT_DELAY_DAYS = 14;

/**
 * Une ligne de TVA, PAR JURIDICTION — et non par marche de facturation.
 *
 * Un marche de facturation est une notion de PRIX — dans quelle devise on vend.
 * **Ce n'est pas une notion de TAXE**, et les confondre etait la faute.
 * Le pays ne suffit pas davantage : environ 9 000 juridictions aux Etats-Unis,
 * et au Royaume-Uni un taux qui depend du couple juridiction x nature de la
 * prestation (l'arret Derby Quad a juge que l'exoneration des places de theatre
 * ne s'etend pas au direct diffuse).
 */
export interface VatLine {
  readonly jurisdictionCode: string;
  readonly jurisdictionLevel: TaxJurisdictionLevel;
  readonly supplyKind: TaxSupplyKind;
  /** LE TAUX APPLIQUE A LA VENTE, conserve — jamais le taux courant. */
  readonly rateBps: BasisPoints;
  /** L'assiette : le HT. */
  readonly base: Money;
  readonly amount: Money;
}

/**
 * Extrait une ligne de TVA d'un montant TTC.
 *
 * Le prix affiche a un consommateur est TTC (convention B2C) : la TVA s'en
 * EXTRAIT, elle ne s'y ajoute pas.
 */
export function vatLineFor(
  grossTtc: Money,
  jurisdictionCode: string,
  jurisdictionLevel: TaxJurisdictionLevel,
  rateBps: BasisPoints,
  supplyKind: TaxSupplyKind,
): VatLine {
  const amount = taxIncludedIn(grossTtc, rateBps);
  return {
    jurisdictionCode,
    jurisdictionLevel,
    supplyKind,
    rateBps,
    base: subtract(grossTtc, amount),
    amount,
  };
}

export interface PayoutInput {
  readonly grossTtc: Money;
  readonly vatLines: readonly VatLine[];
  readonly commissionRateBps: BasisPoints;
}

export interface PayoutBreakdown {
  readonly grossTtc: Money;
  readonly vatLines: readonly VatLine[];
  readonly vatTotal: Money;
  readonly grossHt: Money;
  readonly commissionRateBps: BasisPoints;
  readonly commission: Money;
  readonly net: Money;
}

/**
 * Le calcul, dans l'ordre qui compte.
 *
 * Chaque composante est arrondie SEPAREMENT, et le HT est obtenu par
 * SOUSTRACTION — jamais par `applyRate(ttc, 10000 − taux)`, qui derive d'un
 * centime des que l'arrondi tombe sur une moitie.
 */
export function payoutOf(input: PayoutInput): PayoutBreakdown {
  const currency = input.grossTtc.currencyCode;
  const vatTotal = sum(
    input.vatLines.map((line) => line.amount),
    currency,
  );
  const grossHt = subtract(input.grossTtc, vatTotal);
  const commission = applyRate(grossHt, input.commissionRateBps);
  return {
    grossTtc: input.grossTtc,
    vatLines: input.vatLines,
    vatTotal,
    grossHt,
    commissionRateBps: input.commissionRateBps,
    commission,
    net: subtract(grossHt, commission),
  };
}

/**
 * L'echeance : fin du direct + 14 jours.
 *
 * ⚠ Depuis la FIN DU DIRECT, pas depuis le paiement — d'ou la consommation de
 * `streaming.run.ended.v1` par `payouts`. Un spectateur qui achete trois mois
 * a l'avance ne declenche pas un versement trois mois avant le spectacle.
 */
export function dueAtFor(runEndedAt: Instant): Instant {
  return fromEpochMs(toEpochMs(runEndedAt) + PAYOUT_DELAY_DAYS * DAY_MS);
}

/**
 * L'etat d'un versement.
 *
 * L'ordre des tests est la preseance, et il n'est pas arbitraire : une
 * suspension bancaire prime sur tout, parce qu'elle protege contre un virement
 * vers un compte dont on doute. Vient ensuite l'issue, qui engage de l'argent
 * du spectateur.
 */
export function payoutStateFor(
  outcome: DateOutcome | null,
  alreadyPaid: boolean,
  bankChangePending: boolean,
): PayoutState {
  if (bankChangePending) return PayoutState.SUSPENDED;
  if (outcome === Outcome.CANCELLED) return PayoutState.REFUNDED;
  if (outcome !== null) return PayoutState.HELD;
  return alreadyPaid ? PayoutState.PAID : PayoutState.SCHEDULED;
}

/**
 * L'AVOIR — une monnaie interne, donc un passif.
 *
 * `storefront-web` le releve : il apparait dans la copie — « interrompue,
 * avoirs emis » — et NULLE PART AILLEURS dans le dossier.
 *
 * ⚠ Le piege, ecrit avant de le rencontrer : quand un spectateur paie avec un
 * avoir, Stripe recoit MOINS, mais l'artiste de la date achetee doit etre paye
 * EN ENTIER — il n'est pour rien dans l'incident d'un autre spectacle. La
 * plateforme finance donc cette part sur ses propres fonds.
 *
 * D'ou la portee retenue (D-017) : un avoir est emis pour une issue
 * `interrupted` et n'est redeployable que sur LA MEME CHAINE. La retenue de
 * versement deja en place sur cette chaine couvre alors l'engagement — on
 * retient ce qu'on devra re-verser.
 */
export const CREDIT_VALIDITY_MONTHS = 12;

export function creditAmountFor(paidAmount: Money): Money {
  return money(paidAmount.amountMinor, paidAmount.currencyCode);
}
