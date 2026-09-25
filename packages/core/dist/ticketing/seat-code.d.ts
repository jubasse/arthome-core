/**
 * The seat code — issued by the server, never derived client-side.
 *
 * `storefront-web` Q18: it appears identically on web, mobile and TV, and the mockup computed it
 * by hashing. The three surfaces are written in three languages on three stacks, so that gives
 * three codes for the same seat the day one changes hash function. This module validates shape and
 * formats; generation is a service-side write needing randomness and a uniqueness constraint.
 */
/**
 * The alphabet: Crockford base 32 — the ten digits and the letters except `I`, `L`, `O` and `U`.
 *
 * ⚠ Excluding both members of a confusable pair (`0` and `O`) makes correction impossible: a
 * viewer who dictates "O" has no valid value to be brought back to. Crockford keeps one member of
 * each pair, so `I` and `L` can only be `1` and `O` can only be `0`. `U` is excluded for an
 * unrelated reason, to avoid spelling a rude word.
 */
export declare const SEAT_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export declare const SEAT_CODE_BODY_LENGTH = 6;
export declare function isSeatCode(value: string): boolean;
/**
 * Composes a code from a body already drawn by the service, which owns the cryptographic
 * randomness: a source here would make this package depend on a platform API.
 */
export declare function seatCode(body: string): string;
/**
 * Normalises human input before comparison: case, spaces, a forgotten hyphen, an omitted prefix
 * and the confusables, which are absent from the alphabet and so cannot be guessed wrong.
 *
 * ⚠ Nothing else is corrected. A character still outside the alphabet fails `isSeatCode`, which
 * is the right result: better "this code does not exist" than a neighbour found by accident.
 *
 * ⚠ `U` is not mapped, unlike `I`, `L` and `O`: a pairing code is read off a screen three metres
 * away, where `U` and `V` are one confusable class, while a seat code is dictated over a telephone,
 * where "you" and "vee" are distinct. A wrong seat correction finds somebody else's seat.
 */
export declare function normalizeSeatCodeInput(raw: string): string;
//# sourceMappingURL=seat-code.d.ts.map