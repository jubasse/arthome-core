/**
 * The seat code — issued by the server, never derived client-side. This module validates a shape and
 * formats; generation needs randomness and a uniqueness constraint, so it is a service-side write.
 *
 * `storefront-web` Q18: the mockup hashed it, and the three surfaces are written in three languages
 * on three stacks — three codes for one seat the day one changes hash function.
 */

import { DomainError } from '../kernel/errors.js';
import { DomainErrorCode } from '../vocabulary/error-codes.js';

/**
 * The alphabet: Crockford base 32 — the ten digits and the letters except `I`, `L`, `O` and `U`,
 * the last of those to avoid spelling a rude word.
 *
 * Excluding both members of a confusable pair makes correction impossible: a viewer who dictates
 * "O" has no valid value to return to. Crockford keeps one of each pair, so `I` and `L` can only be
 * `1`, and `O` only `0`.
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
 * Composes a code from a body already drawn by the service, which owns the cryptographic
 * randomness: a source here would make this package depend on a platform API.
 */
export function seatCode(body: string): string {
  const normalized = body.toUpperCase();
  const code = `${SEAT_CODE_PREFIX}-${normalized}`;
  if (!isSeatCode(code)) {
    throw new DomainError({ code: DomainErrorCode.SEAT_CODE_MALFORMED, params: { body } });
  }
  return code;
}

/**
 * Normalises human input before comparison: case, spaces, a forgotten hyphen, an omitted prefix and
 * the confusables, which are absent from the alphabet and so cannot be guessed wrong.
 *
 * Nothing else is corrected — a character still outside the alphabet fails `isSeatCode`, and
 * better "this code does not exist" than a neighbour found by accident.
 *
 * `U` is not mapped, unlike `I`, `L` and `O`: it is confusable with `V` off a television, not
 * over a telephone, and a wrong seat correction finds somebody else's seat.
 */
export function normalizeSeatCodeInput(raw: string): string {
  const typed = raw.toUpperCase().replace(/[\s-]/g, '').replace(/[IL]/g, '1').replace(/O/g, '0');

  // The prefix is optional on input, but the body alphabet contains A, T and H, so a body may
  // legitimately begin with `ATH` and stripping unconditionally refused a valid seat —
  // `ATH123` became a three-character body, roughly one code in 32,768. Both readings are tried
  // instead, which is decidable rather than a guess: a valid body is exactly
  // SEAT_CODE_BODY_LENGTH, so one input cannot satisfy both lengths.
  const bare = `${SEAT_CODE_PREFIX}-${typed}`;
  if (isSeatCode(bare)) return bare;

  const stripped = `${SEAT_CODE_PREFIX}-${typed.replace(/^ATH/, '')}`;
  if (isSeatCode(stripped)) return stripped;

  // Neither reading is a code: return what the person typed and let `isSeatCode` say no.
  return bare;
}
