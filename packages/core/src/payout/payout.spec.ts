import { describe, expect, it } from 'vitest';

import { money } from '../money/money.js';
import { DateOutcome } from '../vocabulary/catalog.js';
import { PayoutState, TaxJurisdictionLevel, TaxSupplyKind } from '../vocabulary/commerce.js';
import { COMMISSION_RATE_BPS, PAYOUT_DELAY_DAYS, dueAtFor, payoutOf, payoutStateFor, vatLineFor } from './index.js';

const eur = (amountMinor: number) => money(amountMinor, 'EUR');
const chf = (amountMinor: number) => money(amountMinor, 'CHF');

/**
 * INVARIANT PROTEGE
 *   La commission porte sur le HT. Pour un MEME HT, elle est IDENTIQUE quelle
 *   que soit la juridiction de l'acheteur.
 *
 * POURQUOI CE TEST EXISTE
 *   D5 : `fixtures.js` calcule `net = brut − 12 % − TVA(brut)` avec un taux
 *   unique, et le resultat est plausible A L'EURO PRES. C'est le piege
 *   « forme contre regle » dans sa forme la plus couteuse : le portage naif
 *   consiste exactement a recopier trois lignes qui ont l'air justes.
 *
 *   Sur le TTC, les 12 % annonces aux artistes VARIERAIENT avec le pays de
 *   l'acheteur. Une commission est le prix d'un service ; elle n'a aucune
 *   raison de suivre un taux de TVA etranger.
 *
 *   Ecrit AVANT la regle.
 */
describe('la commission porte sur le HT', () => {
  it('est identique en France et en Suisse pour un meme HT', () => {
    // Un artiste qui gagne 24,64 € HT gagne la meme chose quel que soit le
    // pays de l'acheteur. C'est CA que « 12 % » promet.
    const htAmount = 2464;

    const france = payoutOf({
      grossTtc: eur(htAmount + 136),
      vatLines: [vatLineFor(eur(htAmount + 136), 'FR', TaxJurisdictionLevel.COUNTRY, 550, TaxSupplyKind.LIVE_STREAM_ACCESS)],
      commissionRateBps: COMMISSION_RATE_BPS,
    });
    const suisse = payoutOf({
      grossTtc: chf(htAmount + 64),
      vatLines: [vatLineFor(chf(htAmount + 64), 'CH', TaxJurisdictionLevel.COUNTRY, 260, TaxSupplyKind.LIVE_STREAM_ACCESS)],
      commissionRateBps: COMMISSION_RATE_BPS,
    });

    expect(france.grossHt.amountMinor).toBe(htAmount);
    expect(suisse.grossHt.amountMinor).toBe(htAmount);
    expect(france.commission.amountMinor).toBe(suisse.commission.amountMinor);
    expect(france.net.amountMinor).toBe(suisse.net.amountMinor);
  });

  it('NE serait PAS identique si la commission portait sur le TTC', () => {
    // La demonstration de ce qu'on evite : a TTC egal, le HT differe selon le
    // taux, donc 12 % du TTC donnerait la meme commission mais un NET
    // different — et l'artiste ne saurait pas pourquoi.
    const ttc = 2600;
    const france = payoutOf({
      grossTtc: eur(ttc),
      vatLines: [vatLineFor(eur(ttc), 'FR', TaxJurisdictionLevel.COUNTRY, 550, TaxSupplyKind.LIVE_STREAM_ACCESS)],
      commissionRateBps: COMMISSION_RATE_BPS,
    });
    const suisse = payoutOf({
      grossTtc: chf(ttc),
      vatLines: [vatLineFor(chf(ttc), 'CH', TaxJurisdictionLevel.COUNTRY, 260, TaxSupplyKind.LIVE_STREAM_ACCESS)],
      commissionRateBps: COMMISSION_RATE_BPS,
    });

    // A TTC fixe, les HT different — donc les commissions aussi.
    expect(france.grossHt.amountMinor).not.toBe(suisse.grossHt.amountMinor);
    expect(france.commission.amountMinor).not.toBe(suisse.commission.amountMinor);
  });

  it('extrait la TVA du TTC, jamais ne l\'y ajoute', () => {
    // L'erreur classique — `ttc x taux / 10000` — surestime la taxe de
    // `taux / (10000 + taux)`, soit 5 % sur un taux a 5,5 %.
    const line = vatLineFor(eur(2600), 'FR', TaxJurisdictionLevel.COUNTRY, 550, TaxSupplyKind.LIVE_STREAM_ACCESS);
    expect(line.amount.amountMinor).toBe(136); // 2600 x 550 / 10550
    expect(line.base.amountMinor).toBe(2464); // le HT, qui est l'assiette reelle
  });
});

/**
 * INVARIANT PROTEGE
 *   La ventilation est PAR JURIDICTION, et le total se referme exactement.
 *
 * POURQUOI
 *   Environ 9 000 juridictions aux Etats-Unis. Une commande peut porter
 *   plusieurs lignes ; leur somme doit etre EXACTEMENT la TVA retiree du TTC,
 *   sinon le net derive d'un centime par commande.
 */
describe('la ventilation par juridiction', () => {
  it('se referme exactement : HT + TVA = TTC', () => {
    const grossTtc = eur(2600);
    const breakdown = payoutOf({
      grossTtc,
      vatLines: [vatLineFor(grossTtc, 'FR', TaxJurisdictionLevel.COUNTRY, 550, TaxSupplyKind.LIVE_STREAM_ACCESS)],
      commissionRateBps: COMMISSION_RATE_BPS,
    });

    expect(breakdown.grossHt.amountMinor + breakdown.vatTotal.amountMinor).toBe(grossTtc.amountMinor);
  });

  it('accepte plusieurs juridictions sur une meme commande', () => {
    // Etat + comte + ville : trois lignes, une seule assiette.
    const grossTtc = money(10_000, 'USD');
    const breakdown = payoutOf({
      grossTtc,
      vatLines: [
        vatLineFor(grossTtc, 'US-CA', TaxJurisdictionLevel.STATE, 600, TaxSupplyKind.LIVE_STREAM_ACCESS),
        vatLineFor(grossTtc, 'US-CA-SF', TaxJurisdictionLevel.CITY, 125, TaxSupplyKind.LIVE_STREAM_ACCESS),
      ],
      commissionRateBps: COMMISSION_RATE_BPS,
    });

    expect(breakdown.vatLines).toHaveLength(2);
    expect(breakdown.grossHt.amountMinor + breakdown.vatTotal.amountMinor).toBe(10_000);
  });

  it('ne produit jamais de monnaie : HT − commission = net', () => {
    for (const amount of [2600, 1, 99, 12_345, 7]) {
      const grossTtc = eur(amount);
      const breakdown = payoutOf({
        grossTtc,
        vatLines: [vatLineFor(grossTtc, 'FR', TaxJurisdictionLevel.COUNTRY, 550, TaxSupplyKind.LIVE_STREAM_ACCESS)],
        commissionRateBps: COMMISSION_RATE_BPS,
      });
      expect(breakdown.net.amountMinor + breakdown.commission.amountMinor).toBe(breakdown.grossHt.amountMinor);
    }
  });
});

/**
 * INVARIANT PROTEGE
 *   Un versement est RETENU tant qu'une issue est ouverte, et REMBOURSE si la
 *   date est annulee. L'echeance court depuis la FIN DU DIRECT.
 *
 * POURQUOI
 *   Ce que `shared/` porte et qui fait autorite : commission 12 %, delai
 *   14 jours, retenue tant qu'une issue est ouverte. C'est la seule partie de
 *   la formule des fixtures qui soit une vraie regle.
 */
describe("l'etat d'un versement", () => {
  it('retient tant qu\'une issue est ouverte', () => {
    expect(payoutStateFor(DateOutcome.POSTPONED, false, false)).toBe(PayoutState.HELD);
    expect(payoutStateFor(DateOutcome.INTERRUPTED, false, false)).toBe(PayoutState.HELD);
  });

  it('rembourse quand la date est annulee', () => {
    expect(payoutStateFor(DateOutcome.CANCELLED, false, false)).toBe(PayoutState.REFUNDED);
  });

  it('suspend quand un changement bancaire attend sa contre-signature', () => {
    // Il SUSPEND le virement en cours : une ecriture ne peut pas porter cela,
    // c'est un agregat a double detente.
    expect(payoutStateFor(null, false, true)).toBe(PayoutState.SUSPENDED);
    // Et la suspension prime sur le programme normal.
    expect(payoutStateFor(null, true, true)).toBe(PayoutState.SUSPENDED);
  });

  it('court depuis la fin du direct, pas depuis le paiement', () => {
    expect(dueAtFor('2026-09-21T21:00:00.000Z')).toBe('2026-10-05T21:00:00.000Z');
    expect(PAYOUT_DELAY_DAYS).toBe(14);
  });
});
