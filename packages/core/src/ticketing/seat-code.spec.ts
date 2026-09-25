import { describe, expect, it } from 'vitest';

import { SEAT_CODE_ALPHABET, isSeatCode, normalizeSeatCodeInput, seatCode } from './seat-code.js';

/**
 * A first draft excluded BOTH members of a confusable pair (`0` AND `O`): a
 * viewer who dictates "O" then has no valid value to be brought back to.
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

describe('the shape of the code', () => {
  it('accepts a valid shape', () => {
    expect(seatCode('7K2M9P')).toBe('ATH-7K2M9P');
    expect(isSeatCode('ATH-7K2M9P')).toBe(true);
  });

  it('refuses a body carrying an excluded letter', () => {
    expect(() => seatCode('7K2MOP')).toThrow();
    expect(() => seatCode('7K2M9')).toThrow();
    expect(() => seatCode('7K2M9PX')).toThrow();
  });

  it('refuses a code with no prefix', () => {
    expect(isSeatCode('7K2M9P')).toBe(false);
  });
});

/**
 * Better "this code does not exist" than a neighbouring code found by accident:
 * a support agent validating the wrong seat lets somebody in in another's place.
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
    // Over a telephone "you" and "vee" are distinct, so `U`/`V` is not a
    // confusable class on this channel.
    expect(isSeatCode(normalizeSeatCodeInput('7K2MUP'))).toBe(false);
    expect(isSeatCode(normalizeSeatCodeInput('7K2M#P'))).toBe(false);
  });

  it('accepts a body that BEGINS with the prefix letters', () => {
    // The defect this exists for: the optional prefix was stripped
    // unconditionally, and the body alphabet contains A, T and H — so ATH-ATH123
    // typed as its six characters was falsely rejected. One code in 32,768.
    expect(normalizeSeatCodeInput('ATH123')).toBe('ATH-ATH123');
    expect(isSeatCode(normalizeSeatCodeInput('ATH123'))).toBe(true);

    expect(normalizeSeatCodeInput('ATH-ATH123')).toBe('ATH-ATH123');
    expect(normalizeSeatCodeInput('ath ath 123')).toBe('ATH-ATH123');
  });

  it('still strips a real prefix typed without its hyphen', () => {
    expect(normalizeSeatCodeInput('ATH7K2M9P')).toBe('ATH-7K2M9P');
    expect(normalizeSeatCodeInput('7K2M9P')).toBe('ATH-7K2M9P');
  });

  it('never has two valid readings to arbitrate between', () => {
    // A valid body is exactly six characters, so the stripped reading can only
    // be valid at nine typed characters and the bare one at six — never both.
    // The Set counts DISTINCT readings; counting one twice read as ambiguity.
    for (const typed of ['ATH123', 'ATH7K2M9P', 'ATHATH123', '7K2M9P']) {
      const valid = new Set(
        [typed, typed.replace(/^ATH/, '')].map((body) => `ATH-${body}`).filter(isSeatCode),
      );
      expect(valid.size).toBeLessThanOrEqual(1);
    }
  });
});
