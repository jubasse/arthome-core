import { describe, expect, it } from 'vitest';

import { money } from '../money/money.js';
import { Locale } from './locale.js';
import { formatCompact, formatInteger, formatMoney } from './number.js';

/**
 * INVARIANT PROTEGE
 *   Le contrat transporte un CODE DEVISE, jamais un symbole ni une position de
 *   symbole. La derivation vit ici, une seule fois.
 *
 * POURQUOI
 *   Cinq surfaces formatent les memes montants. Cinq tables de symboles
 *   produiraient cinq resultats, et l'une d'elles mettrait le symbole du
 *   mauvais cote. Et le formatage se fait SANS `Intl` : le moteur de React
 *   Native n'en offre pas partout une implementation complete, et le polyfill
 *   coute plusieurs centaines de kilo-octets dans cinq applications.
 */
describe('le formatage des montants', () => {
  it('place le symbole selon la langue, pas selon la devise', () => {
    const price = money(2650, 'EUR');
    expect(formatMoney(price, Locale.FR)).toBe('26,50 €');
    expect(formatMoney(price, Locale.EN)).toBe('€26.50');
  });

  it('omet les centimes quand ils sont nuls', () => {
    expect(formatMoney(money(2600, 'EUR'), Locale.FR)).toBe('26 €');
  });

  it('rend le CODE pour une devise inconnue, jamais un symbole devine', () => {
    // « 26,00 XPF » est juste ; « 26,00 ¤ » est un mensonge poli.
    expect(formatMoney(money(2600, 'XPF'), Locale.FR)).toBe('26 XPF');
  });

  it('porte correctement un montant negatif — remboursement et avoir', () => {
    expect(formatMoney(money(-2650, 'EUR'), Locale.FR)).toBe('-26,50 €');
  });

  it('groupe les milliers avec un espace insecable en francais', () => {
    expect(formatInteger(20732, Locale.FR)).toBe('20 732');
    expect(formatInteger(20732, Locale.EN)).toBe('20,732');
  });
});

/**
 * INVARIANT PROTEGE
 *   Le compteur d'audience est compact au-dela de mille, exact en deca.
 *
 * POURQUOI
 *   En deca de mille, le nombre exact est plus informatif et tient dans la
 *   meme largeur. Et la regle du dossier interdit « 0 EN DIRECT » : le
 *   compteur est ABSENT quand il n'y a pas d'antenne, ce qui est une decision
 *   de contrat, pas de formatage — d'ou l'absence de cas zero ici.
 */
describe('le compteur compact', () => {
  it('reste exact sous mille', () => {
    expect(formatCompact(860, Locale.FR)).toBe('860');
  });

  it('abrege au-dela', () => {
    expect(formatCompact(12_400, Locale.FR)).toBe('12,4 k');
    expect(formatCompact(12_400, Locale.EN)).toBe('12.4 k');
    expect(formatCompact(1_200_000, Locale.FR)).toBe('1,2 M');
  });

  it('omet la decimale quand elle est nulle', () => {
    expect(formatCompact(12_000, Locale.FR)).toBe('12 k');
  });
});
