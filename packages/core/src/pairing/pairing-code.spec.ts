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
 * PROTECTED INVARIANT
 *   Every normalisable confusable class keeps EXACTLY ONE member of itself in
 *   the alphabet. No mapped class keeps two. The one class that keeps three is
 *   refused by name rather than corrected.
 *
 * WHY THIS TEST EXISTS
 *   The alphabet lived as a string inside `adr-auth.md` §5.1 and nowhere else.
 *   It drifted twice in two days — the second time as a duplicate copy written
 *   three paragraphs below the first, inside the section arguing against
 *   restating values. Four prose reviews missed it; an assertion caught it
 *   immediately.
 *
 *   So these assertions are computed FROM THE STRING, never written beside it.
 *   A test that restated the expected survivors would be the parallel literal
 *   table again, wearing a test's costume.
 *
 *   And the invariant does not determine the string: 960 alphabets satisfy it
 *   (3 × 2^5 × C(5,3)). That is why the value is imported and not reconstructed
 *   here — shape alone would have produced a conformant alphabet that is not
 *   this one, and nothing would have noticed until a paired television refused
 *   a valid code.
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
    // 36 alphanumerics minus nine exclusions.
    expect(PAIRING_CODE_ALPHABET).toHaveLength(36 - 9);
  });

  it('keeps EXACTLY ONE member of every normalisable class', () => {
    // THE ASSERTION THAT STOPS A THIRD DRIFT, and it is computed.
    for (const confusableClass of PAIRING_CONFUSABLE_CLASSES) {
      const survivors = survivorsOf(confusableClass);
      const isRefusingClass = survivors.length > 1;

      if (!isRefusingClass) {
        expect(survivors).toHaveLength(1);
      }
      // No class may keep exactly two: a misreading would then produce a code
      // that is valid but wrong, with nothing to signal where.
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
      // The source is excluded — we never "correct" a character that is legal.
      expect(PAIRING_CODE_ALPHABET).not.toContain(typed);
      // The target is the class's single survivor.
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
    // Every excluded glyph is either mapped or declared ambiguous — no third
    // category, which is what makes the table exhaustive rather than partial.
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

/**
 * PROTECTED INVARIANT
 *   Refusing is a named outcome, never a guess — and never a silent pass.
 */
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
    // The whole reason `0` and `O` are unmapped: their class keeps three
    // members, so there is no correct target. One retry on a remote beats a
    // guess.
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
