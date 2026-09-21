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
    // `U` has no single reading: we do not correct it.
    expect(isSeatCode(normalizeSeatCodeInput('7K2MUP'))).toBe(false);
    expect(isSeatCode(normalizeSeatCodeInput('7K2M#P'))).toBe(false);
  });
});
