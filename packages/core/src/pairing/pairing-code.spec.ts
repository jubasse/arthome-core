import { describe, expect, it } from 'vitest';

import {
  PAIRING_CODE_ALPHABET,
  PAIRING_CODE_AMBIGUOUS_GLYPHS,
  PAIRING_CODE_LENGTH,
  PAIRING_CODE_NORMALISATION,
  PAIRING_CONFUSABLE_CLASSES,
  isPairingCode,
  normalizePairingCodeInput,
  survivorsOf,
} from './pairing-code.js';

/**
 * The assertions are computed FROM the imported string, never written beside
 * it: a restated table of survivors would be the parallel literal again, in a
 * test's costume. And the invariant does not pin the value — 960 alphabets
 * satisfy it (3 × 2^5 × C(5,3)) — so the alphabet is imported, never rebuilt
 * here from its shape.
 */
describe('the pairing alphabet', () => {
  it('has 27 symbols, all distinct', () => {
    expect(PAIRING_CODE_ALPHABET).toHaveLength(27);
    expect(new Set(PAIRING_CODE_ALPHABET).size).toBe(27);
  });

  it('excludes exactly the nine confusable glyphs', () => {
    for (const excluded of ['0', '1', 'B', 'G', 'I', 'O', 'S', 'U', 'Z']) {
      expect(PAIRING_CODE_ALPHABET).not.toContain(excluded);
    }
    expect(PAIRING_CODE_ALPHABET).toHaveLength(36 - 9);
  });

  it('keeps EXACTLY ONE member of every normalisable class', () => {
    for (const confusableClass of PAIRING_CONFUSABLE_CLASSES) {
      const survivors = survivorsOf(confusableClass);
      const isRefusingClass = survivors.length > 1;

      if (!isRefusingClass) {
        expect(survivors).toHaveLength(1);
      }
      // Exactly two survivors would let a misreading give a valid but wrong code.
      expect(survivors).not.toHaveLength(2);
    }
  });

  it('has exactly one refusing class, and it keeps three members', () => {
    const refusing = PAIRING_CONFUSABLE_CLASSES.filter((c) => survivorsOf(c).length > 1);
    expect(refusing).toHaveLength(1);
    expect([...survivorsOf(refusing[0] ?? [])].sort()).toEqual(['C', 'D', 'Q']);
  });

  it('maps every mappable excluded glyph, and only onto a survivor', () => {
    for (const [typed, mapped] of Object.entries(PAIRING_CODE_NORMALISATION)) {
      expect(PAIRING_CODE_ALPHABET).not.toContain(typed);
      expect(PAIRING_CODE_ALPHABET).toContain(mapped);
      const owningClass = PAIRING_CONFUSABLE_CLASSES.find((c) => c.includes(typed));
      expect(owningClass).toBeDefined();
      expect(survivorsOf(owningClass ?? [])).toEqual([mapped]);
    }
  });

  it('leaves the refusing class unmapped, and only it', () => {
    for (const glyph of PAIRING_CODE_AMBIGUOUS_GLYPHS) {
      expect(PAIRING_CODE_NORMALISATION[glyph]).toBeUndefined();
      expect(PAIRING_CODE_ALPHABET).not.toContain(glyph);
    }
    // No third category: that is what makes the table exhaustive, not partial.
    for (const confusableClass of PAIRING_CONFUSABLE_CLASSES) {
      for (const glyph of confusableClass) {
        if (PAIRING_CODE_ALPHABET.includes(glyph)) continue;
        const handled =
          PAIRING_CODE_NORMALISATION[glyph] !== undefined ||
          PAIRING_CODE_AMBIGUOUS_GLYPHS.includes(glyph);
        expect(handled).toBe(true);
      }
    }
  });
});

describe('normalising a typed pairing code', () => {
  it('corrects the six mappable glyphs', () => {
    expect(normalizePairingCodeInput('SBZGIU')).toBe('5826LV');
    expect(normalizePairingCodeInput('sbzgiu')).toBe('5826LV');
    expect(normalizePairingCodeInput('1')).toBe('L');
  });

  it('tolerates case, spaces, hyphens and dots', () => {
    expect(normalizePairingCodeInput(' a c-d.e f ')).toBe('ACDEF');
  });

  it('REFUSES the ambiguous glyphs by name, pointing at the position', () => {
    expect(() => normalizePairingCodeInput('ACD0EF')).toThrow(/ambiguous_glyph/);
    expect(() => normalizePairingCodeInput('ACDOEF')).toThrow(/ambiguous_glyph/);
  });

  it('accepts a normalised six-character code and rejects other lengths', () => {
    expect(isPairingCode(normalizePairingCodeInput('acdefh'))).toBe(true);
    expect(isPairingCode('ACDEF')).toBe(false);
    expect(isPairingCode('ACDEFHJ')).toBe(false);
    expect(PAIRING_CODE_LENGTH).toBe(6);
  });

  it('never yields a character outside the alphabet from a mappable input', () => {
    const everyMappable = Object.keys(PAIRING_CODE_NORMALISATION).join('');
    for (const character of normalizePairingCodeInput(everyMappable)) {
      expect(PAIRING_CODE_ALPHABET).toContain(character);
    }
  });
});
