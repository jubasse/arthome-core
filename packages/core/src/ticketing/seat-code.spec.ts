import { describe, expect, it } from 'vitest';

import { SEAT_CODE_ALPHABET, isSeatCode, normalizeSeatCodeInput, seatCode } from './seat-code.js';

/**
 * INVARIANT PROTEGE
 *   L'alphabet garde UN membre de chaque paire confusable et exclut l'autre —
 *   ce qui rend la normalisation SURE plutot que devinee.
 *
 * POURQUOI CE TEST EXISTE
 *   Une premiere redaction excluait LES DEUX membres (`0` ET `O`). L'erreur ne
 *   se voit qu'au moment d'ecrire la correction : un spectateur qui dicte « O »
 *   n'a alors AUCUNE valeur valide vers laquelle on puisse le ramener.
 *   Crockford garde `0` et `1`, exclut `I`, `L`, `O` et `U`.
 */
describe("l'alphabet du code de place", () => {
  it('exclut I, L, O et U — et elles seules', () => {
    for (const excluded of ['I', 'L', 'O', 'U']) {
      expect(SEAT_CODE_ALPHABET).not.toContain(excluded);
    }
    for (const kept of ['0', '1', '5', 'S', '8', 'B']) {
      expect(SEAT_CODE_ALPHABET).toContain(kept);
    }
  });

  it('compte trente-deux symboles', () => {
    expect(SEAT_CODE_ALPHABET).toHaveLength(32);
  });
});

/**
 * INVARIANT PROTEGE
 *   Le code est EMIS PAR LE SERVEUR. Ce module valide et compose ; il ne
 *   genere pas.
 *
 * POURQUOI
 *   `storefront-web` Q18 : le code s'affiche a l'identique sur trois surfaces.
 *   La maquette le calcule par hachage — ce qui donnerait TROIS codes pour la
 *   meme place des qu'une surface change de fonction. Et une source d'alea est
 *   une API de plateforme, que ce paquet s'interdit.
 */
describe('la forme du code', () => {
  it('accepte une forme valide', () => {
    expect(seatCode('7K2M9P')).toBe('ATH-7K2M9P');
    expect(isSeatCode('ATH-7K2M9P')).toBe(true);
  });

  it('refuse un corps qui porte une lettre exclue', () => {
    expect(() => seatCode('7K2MOP')).toThrow();
    expect(() => seatCode('7K2M9')).toThrow(); // trop court
    expect(() => seatCode('7K2M9PX')).toThrow(); // trop long
  });

  it('refuse un code sans prefixe', () => {
    expect(isSeatCode('7K2M9P')).toBe(false);
  });
});

/**
 * INVARIANT PROTEGE
 *   La normalisation corrige ce qui est SUR, et rien d'autre.
 *
 * POURQUOI
 *   Mieux vaut « ce code n'existe pas » qu'un code voisin trouve par hasard.
 *   Un support qui valide la mauvaise place fait entrer quelqu'un a la place
 *   d'un autre.
 */
describe('la saisie humaine', () => {
  it('ramene I, L et O a leur seule lecture possible', () => {
    expect(normalizeSeatCodeInput('7k2mop')).toBe('ATH-7K2M0P');
    expect(normalizeSeatCodeInput('7K2MIP')).toBe('ATH-7K2M1P');
    expect(normalizeSeatCodeInput('7K2MLP')).toBe('ATH-7K2M1P');
  });

  it('tolere le prefixe, les espaces et les tirets', () => {
    expect(normalizeSeatCodeInput('ath 7k2 m9p')).toBe('ATH-7K2M9P');
    expect(normalizeSeatCodeInput('ATH-7K2M9P')).toBe('ATH-7K2M9P');
  });

  it('ne devine RIEN d\'autre — un caractere inconnu fait echouer', () => {
    // `U` n'a pas de lecture unique : on ne la corrige pas.
    expect(isSeatCode(normalizeSeatCodeInput('7K2MUP'))).toBe(false);
    expect(isSeatCode(normalizeSeatCodeInput('7K2M#P'))).toBe(false);
  });
});
