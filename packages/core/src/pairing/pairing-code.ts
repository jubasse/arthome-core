/**
 * The PAIRING CODE's alphabet — the six characters a television displays and a
 * phone retypes. `adr-auth.md` §5.1 owns the design, this module owns the
 * value: it lived only as prose there and drifted twice in two days, missed by
 * four prose reviews and caught by an assertion on the first run.
 *
 * ⚠ Deliberately NOT `SEAT_CODE_ALPHABET`: the channel decides the confusable
 * classes. `U`/`V` is one here, read off a television, and is not one for a seat
 * code dictated over a telephone — so this alphabet maps `U → V` and ticketing
 * maps nothing.
 */

import { DomainError } from '../kernel/errors.js';
import { DomainErrorCode } from '../vocabulary/error-codes.js';

/**
 * 27 symbols. Read from `adr-auth.md` §5.1, which owns the design. Every
 * exclusion is a glyph confusable at three metres, except `U`, which also rules
 * out an unfortunate six-letter word. 27^6 ≈ 28.5 bits, above RFC 8628 §5.1's
 * threshold given a cap on attempts.
 */
export const PAIRING_CODE_ALPHABET = 'ACDEFHJKLMNPQRTVWXY23456789';

/** Six characters. Never composed with a prefix — unlike a seat code. */
export const PAIRING_CODE_LENGTH = 6;

/** The CONFUSABLE CLASSES this channel recognises, as data so the invariant is computed. */
export const PAIRING_CONFUSABLE_CLASSES: readonly (readonly string[])[] = [
  ['0', 'O', 'D', 'Q', 'C'],
  ['1', 'I', 'L'],
  ['S', '5'],
  ['B', '8'],
  ['Z', '2'],
  ['G', '6'],
  ['U', 'V'],
];

/**
 * The normalisation table, exhaustive over the mappable excluded glyphs.
 * ⚠ `0` and `O` are absent ON PURPOSE: their class keeps THREE members, so a
 * typed `O` has no single correct target and is refused by name instead.
 */
export const PAIRING_CODE_NORMALISATION: Readonly<Record<string, string>> = {
  S: '5',
  B: '8',
  Z: '2',
  G: '6',
  I: 'L',
  '1': 'L',
  U: 'V',
};

/** The glyphs that are excluded AND unmappable — the refusing class's edges. */
export const PAIRING_CODE_AMBIGUOUS_GLYPHS: readonly string[] = ['0', 'O'];

export function isPairingCodeAlphabetMember(character: string): boolean {
  return PAIRING_CODE_ALPHABET.includes(character);
}

/**
 * How many members of a class survive in the alphabet. One survivor makes the
 * class safely normalisable, two would let a misreading produce a code that is
 * VALID BUT WRONG, and three or more mean the class is refused by name.
 */
export function survivorsOf(confusableClass: readonly string[]): readonly string[] {
  return confusableClass.filter(isPairingCodeAlphabetMember);
}

/**
 * Normalises a code typed by a person, or refuses it by name. Refusing is a
 * first-class outcome here: a refusal costs one retry on a remote control, so
 * pointing at the offending position beats guessing.
 */
export function normalizePairingCodeInput(raw: string): string {
  const typed = raw.toUpperCase().replace(/[\s.-]/g, '');

  for (const character of typed) {
    if (PAIRING_CODE_AMBIGUOUS_GLYPHS.includes(character)) {
      throw new DomainError({
        code: DomainErrorCode.PAIRING_CODE_AMBIGUOUS_GLYPH,
        params: { glyph: character, position: String(typed.indexOf(character) + 1) },
      });
    }
  }

  return [...typed].map((character) => PAIRING_CODE_NORMALISATION[character] ?? character).join('');
}

export function isPairingCode(value: string): boolean {
  if (value.length !== PAIRING_CODE_LENGTH) return false;
  return [...value].every(isPairingCodeAlphabetMember);
}
