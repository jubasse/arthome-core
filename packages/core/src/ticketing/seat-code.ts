/**
 * The SEAT CODE — issued by the SERVER, never derived client-side.
 *
 * `storefront-web` Q18: it appears identically on the web, on mobile and on TV.
 * The mockup computes it by HASHING — a convenience which, ported as it stands,
 * would give **three different codes for the same seat** as soon as one surface
 * changed hash function. That is not a theoretical risk: the three surfaces are
 * written in three languages on three different stacks.
 *
 * So this module does not GENERATE a code from an identifier: it validates its
 * SHAPE and formats it. Generation is a service-side write, with a source of
 * randomness and a uniqueness constraint — two things a pure domain does not
 * have.
 */

import { DomainError } from '../kernel/errors.js';

/**
 * The alphabet: Crockford base 32 — the ten digits, and the letters EXCEPT
 * `I`, `L`, `O` and `U`.
 *
 * ⚠ The choice of exclusions is not free, and a first draft got it wrong:
 * excluding BOTH members of a confusable pair (`0` AND `O`) makes correction
 * IMPOSSIBLE — a viewer who dictates "O" to support then has no valid value to
 * be brought back to.
 *
 * Crockford keeps one member of each pair and excludes the other, which makes
 * normalisation SAFE rather than guessed: `I` and `L` can only be `1`, `O` can
 * only be `0`. And `U` is excluded for an unrelated reason — to avoid
 * accidentally spelling a rude word.
 */
export const SEAT_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const SEAT_CODE_BODY_LENGTH = 6;
const SEAT_CODE_PREFIX = 'ATH';

const SEAT_CODE_SHAPE = new RegExp(
  `^${SEAT_CODE_PREFIX}-[${SEAT_CODE_ALPHABET}]{${String(SEAT_CODE_BODY_LENGTH)}}$`,
);

export function isSeatCode(value: string): boolean {
  return SEAT_CODE_SHAPE.test(value);
}

/**
 * Composes a code from a body already drawn by the service.
 *
 * The body comes from a cryptographic randomness source on the service side:
 * the domain has none, and that is just as well — a randomness source would
 * make this package depend on a platform API, which it forbids itself.
 */
export function seatCode(body: string): string {
  const normalized = body.toUpperCase();
  const code = `${SEAT_CODE_PREFIX}-${normalized}`;
  if (!isSeatCode(code)) {
    throw new DomainError({ code: 'seat_code.malformed', params: { body } });
  }
  return code;
}

/**
 * Normalises human input before comparison.
 *
 * Support reads a code over the phone, the viewer retypes it: lowercase,
 * spaces, a forgotten hyphen, an omitted prefix, and above all the confusables.
 * The correction is SAFE and not guessed: `I` and `L` are absent from the
 * alphabet, so they can only be `1`; `O` is absent from it, so it can only be
 * `0`.
 *
 * ⚠ We correct NOTHING else. A character still outside the alphabet after
 * normalisation makes `isSeatCode` fail, and that is the right result: better
 * "this code does not exist" than a neighbouring code found by accident.
 *
 * ⚠ `U` is excluded from the alphabet and is NOT mapped, unlike `I`, `L` and
 * `O`. That asymmetry is deliberate and it is the difference between the two
 * channels: a pairing code is read off a screen three metres away, where `U`
 * and `V` are one confusable class; a seat code is dictated over a telephone,
 * where "you" and "vee" are distinct. So `U` is excluded here for the
 * rude-word reason alone, and there is nothing it could safely become. A wrong
 * pairing correction merely fails; a wrong seat correction finds somebody
 * else's seat.
 */
export function normalizeSeatCodeInput(raw: string): string {
  const typed = raw.toUpperCase().replace(/[\s-]/g, '').replace(/[IL]/g, '1').replace(/O/g, '0');

  // TWO READINGS, AND THEY CANNOT BOTH BE VALID.
  //
  // The prefix is optional on input — support dictates six characters, and the
  // viewer types six. But the body alphabet contains A, T and H, so a body may
  // legitimately BEGIN with `ATH`, and stripping unconditionally ate it:
  // `ATH123` became `ATH-123`, a three-character body, and a valid seat was
  // refused. Roughly one code in 32,768 — three positions of a 32-symbol
  // alphabet.
  //
  // So we try both readings and keep whichever `isSeatCode` accepts. That is
  // decidable rather than a guess, and the arithmetic says so: a valid body is
  // exactly SEAT_CODE_BODY_LENGTH, so the stripped reading is valid only at
  // length + 3 and the bare reading only at length. One input cannot be both
  // lengths, so at most one reading is ever valid and there is nothing to
  // arbitrate.
  const bare = `${SEAT_CODE_PREFIX}-${typed}`;
  if (isSeatCode(bare)) return bare;

  const stripped = `${SEAT_CODE_PREFIX}-${typed.replace(/^ATH/, '')}`;
  if (isSeatCode(stripped)) return stripped;

  // Neither reading is a code. We return the bare one so the caller sees what
  // the person actually typed, and `isSeatCode` still says no. Guessing a
  // nearer code here is the one thing this module must never do.
  return bare;
}
