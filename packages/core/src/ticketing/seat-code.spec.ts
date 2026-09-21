import { describe, expect, it } from 'vitest';

import { SEAT_CODE_ALPHABET, isSeatCode, normalizeSeatCodeInput, seatCode } from './seat-code.js';

/**
 * PROTECTED INVARIANT
 *   The alphabet keeps ONE member of each confusable pair and excludes the
 *   other — which makes normalisation SAFE rather than guessed.
 *
 * WHY THIS TEST EXISTS
 *   A first draft excluded BOTH members (`0` AND `O`). The error only shows
 *   when you come to write the correction: a viewer who dictates "O" then has
 *   NO valid value to be brought back to. Crockford keeps `0` and `1`, excludes
 *   `I`, `L`, `O` and `U`.
 */
describe('the seat-code alphabet', () => {
  it('excludes I, L, O and U — and only those', () => {
    for (const excluded of ['I', 'L', 'O', 'U']) {
      expect(SEAT_CODE_ALPHABET).not.toContain(excluded);
    }
    for (const kept of ['0', '1', '5', 'S', '8', 'B']) {
      expect(SEAT_CODE_ALPHABET).toContain(kept);
    }
  });

  it('counts thirty-two symbols', () => {
    expect(SEAT_CODE_ALPHABET).toHaveLength(32);
  });
});

/**
 * PROTECTED INVARIANT
 *   The code is ISSUED BY THE SERVER. This module validates and composes; it
 *   does not generate.
 *
 * WHY
 *   `storefront-web` Q18: the code appears identically on three surfaces. The
 *   mockup computes it by hashing — which would give THREE codes for the same
 *   seat as soon as one surface changed function. And a randomness source is a
 *   platform API, which this package forbids itself.
 */
describe('the shape of the code', () => {
  it('accepts a valid shape', () => {
    expect(seatCode('7K2M9P')).toBe('ATH-7K2M9P');
    expect(isSeatCode('ATH-7K2M9P')).toBe(true);
  });

  it('refuses a body carrying an excluded letter', () => {
    expect(() => seatCode('7K2MOP')).toThrow();
    expect(() => seatCode('7K2M9')).toThrow(); // too short
    expect(() => seatCode('7K2M9PX')).toThrow(); // too long
  });

  it('refuses a code with no prefix', () => {
    expect(isSeatCode('7K2M9P')).toBe(false);
  });
});

/**
 * PROTECTED INVARIANT
 *   Normalisation corrects what is SAFE, and nothing else.
 *
 * WHY
 *   Better "this code does not exist" than a neighbouring code found by
 *   accident. A support agent validating the wrong seat lets somebody in in
 *   another person's place.
 */
describe('human input', () => {
  it('brings I, L and O back to their only possible reading', () => {
    expect(normalizeSeatCodeInput('7k2mop')).toBe('ATH-7K2M0P');
    expect(normalizeSeatCodeInput('7K2MIP')).toBe('ATH-7K2M1P');
    expect(normalizeSeatCodeInput('7K2MLP')).toBe('ATH-7K2M1P');
  });

  it('tolerates the prefix, spaces and hyphens', () => {
    expect(normalizeSeatCodeInput('ath 7k2 m9p')).toBe('ATH-7K2M9P');
    expect(normalizeSeatCodeInput('ATH-7K2M9P')).toBe('ATH-7K2M9P');
  });

  it('guesses NOTHING else — an unknown character makes it fail', () => {
    // `U` has no single reading: we do not correct it. And that is deliberate —
    // over a telephone "you" and "vee" are distinct, so `U`/`V` is not a
    // confusable class on this channel the way it is on a paired screen.
    expect(isSeatCode(normalizeSeatCodeInput('7K2MUP'))).toBe(false);
    expect(isSeatCode(normalizeSeatCodeInput('7K2M#P'))).toBe(false);
  });

  it('accepts a body that BEGINS with the prefix letters', () => {
    // THE DEFECT THIS TEST EXISTS FOR. The prefix is optional on input, so it
    // used to be stripped unconditionally — and the body alphabet contains A, T
    // and H. A viewer holding ATH-ATH123 and typing the six characters they
    // were given got a three-character body and a false rejection. Roughly one
    // code in 32,768.
    expect(normalizeSeatCodeInput('ATH123')).toBe('ATH-ATH123');
    expect(isSeatCode(normalizeSeatCodeInput('ATH123'))).toBe(true);

    // And the prefixed form of that same code still resolves to itself.
    expect(normalizeSeatCodeInput('ATH-ATH123')).toBe('ATH-ATH123');
    expect(normalizeSeatCodeInput('ath ath 123')).toBe('ATH-ATH123');
  });

  it('still strips a real prefix typed without its hyphen', () => {
    // The reading the fix must not lose: prefix + body run together.
    expect(normalizeSeatCodeInput('ATH7K2M9P')).toBe('ATH-7K2M9P');
    expect(normalizeSeatCodeInput('7K2M9P')).toBe('ATH-7K2M9P');
  });

  it('never has two valid readings to arbitrate between', () => {
    // The property that makes "try both" a decision and not a guess: a valid
    // body is exactly six characters, so the stripped reading can only be valid
    // at nine typed characters and the bare one only at six. No input is both
    // lengths, so the two readings are never both codes.
    //
    // DISTINCT readings — an input with no prefix to strip yields the same
    // string twice, which is one reading counted twice and not an ambiguity.
    // Writing this test the other way is what caught that.
    for (const typed of ['ATH123', 'ATH7K2M9P', 'ATHATH123', '7K2M9P']) {
      const valid = new Set(
        [typed, typed.replace(/^ATH/, '')].map((body) => `ATH-${body}`).filter(isSeatCode),
      );
      expect(valid.size).toBeLessThanOrEqual(1);
    }
  });
});
