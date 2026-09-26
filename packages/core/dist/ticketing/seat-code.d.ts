/**
 * The seat code — issued by the server, never derived client-side. This module validates a shape and
 * formats; generation needs randomness and a uniqueness constraint, so it is a service-side write.
 *
 * `storefront-web` Q18: the mockup hashed it, and the three surfaces are written in three languages
 * on three stacks — three codes for one seat the day one changes hash function.
 */
/**
 * The alphabet: Crockford base 32 — the ten digits and the letters except `I`, `L`, `O` and `U`,
 * the last of those to avoid spelling a rude word.
 *
 * Excluding both members of a confusable pair makes correction impossible: a viewer who dictates
 * "O" has no valid value to return to. Crockford keeps one of each pair, so `I` and `L` can only be
 * `1`, and `O` only `0`.
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
 * Normalises human input before comparison: case, spaces, a forgotten hyphen, an omitted prefix and
 * the confusables, which are absent from the alphabet and so cannot be guessed wrong.
 *
 * Nothing else is corrected — a character still outside the alphabet fails `isSeatCode`, and
 * better "this code does not exist" than a neighbour found by accident.
 *
 * `U` is not mapped, unlike `I`, `L` and `O`: it is confusable with `V` off a television, not
 * over a telephone, and a wrong seat correction finds somebody else's seat.
 */
export declare function normalizeSeatCodeInput(raw: string): string;
//# sourceMappingURL=seat-code.d.ts.map