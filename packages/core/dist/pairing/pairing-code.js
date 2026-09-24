/**
 * The PAIRING CODE's alphabet — the six characters a television displays and a
 * phone retypes.
 *
 * ⚠ THIS CONSTANT EXISTS BECAUSE PROSE HAS NO GATE. Until now the value lived
 * as a string inside `adr-auth.md` §5.1 and nowhere else. It drifted twice in
 * two days, and the second drift was a second copy written three paragraphs
 * below the first — inside the section that argues against restating values.
 * Four prose reviews passed over it; an assertion caught it on the first run.
 * That is the whole reason this file exists, and it is not a fact about prose,
 * it is a fact about where the value lived.
 *
 * `adr-auth.md` owns the DESIGN of this alphabet and keeps its reasoning. This
 * module owns the VALUE. The ADR now cites the identifier and restates nothing,
 * which is the rule it applies to `SEAT_CODE_ALPHABET`.
 *
 * ⚠ IT IS DELIBERATELY NOT `SEAT_CODE_ALPHABET`, and the difference is the
 * point. **The channel decides what counts as a confusable class; the
 * arithmetic then decides whether that class can be normalised.**
 *
 *   pairing   read once off a television at three metres, then discarded.
 *             A rejection costs one retry on the remote.
 *   seat      dictated to support and retyped off a printed confirmation
 *             months later. A rejection costs a phone call.
 *
 * So `U`/`V` is one confusable class here and is NOT one for the seat code:
 * "you" and "vee" are distinct over a telephone. This alphabet maps `U → V`;
 * ticketing excludes `U` for the rude-word reason alone and maps nothing.
 * Two correct implementations, the same pair, different treatment, neither
 * wrong.
 */
import { DomainError } from '../kernel/errors.js';
/**
 * 27 symbols. Read from `adr-auth.md` §5.1, which owns the design.
 *
 * Excluded: `0 1 B G I O S U Z`. Every exclusion is a confusable glyph at
 * three metres, except `U`, which also rules out six-letter codes forming an
 * unfortunate word on a living-room television at 120 points.
 *
 * 27^6 ≈ 3.9 × 10^8, i.e. 28.5 bits — above RFC 8628 §5.1's threshold, given
 * that a cap on attempts exists.
 */
export const PAIRING_CODE_ALPHABET = 'ACDEFHJKLMNPQRTVWXY23456789';
/** Six characters. Never composed with a prefix — unlike a seat code. */
export const PAIRING_CODE_LENGTH = 6;
/**
 * The CONFUSABLE CLASSES this channel recognises, written as data so the
 * invariant below can be computed rather than asserted by hand.
 *
 * This list is channel-specific and that is deliberate: it is what a viewer
 * confuses reading a screen from a sofa, which is not what a support agent
 * confuses hearing a code over a telephone.
 */
export const PAIRING_CONFUSABLE_CLASSES = [
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
 *
 * `0` and `O` are absent ON PURPOSE. Their whole class — `0 O D Q C` — keeps
 * THREE members, so a typed `O` has no single correct target and correcting it
 * would be a guess. The contract answers `PAIRING_CODE_AMBIGUOUS_GLYPH` and
 * points at the position instead, which beats both a silent refusal and an
 * invented correction.
 */
export const PAIRING_CODE_NORMALISATION = {
    S: '5',
    B: '8',
    Z: '2',
    G: '6',
    I: 'L',
    '1': 'L',
    U: 'V',
};
/** The glyphs that are excluded AND unmappable — the refusing class's edges. */
export const PAIRING_CODE_AMBIGUOUS_GLYPHS = ['0', 'O'];
export function isPairingCodeAlphabetMember(character) {
    return PAIRING_CODE_ALPHABET.includes(character);
}
/**
 * How many members of a class survive in the alphabet.
 *
 * This is the arithmetic the invariant rests on, and it is exported because it
 * is the thing a reader should be able to re-run rather than believe:
 *   - exactly one survivor  → the class is normalisable, and safely;
 *   - two survivors         → a misreading produces a code that is VALID BUT
 *                             WRONG, with nothing to signal where. FORBIDDEN;
 *   - three or more         → the class is removed from the code space and a
 *                             typed member is refused by name.
 */
export function survivorsOf(confusableClass) {
    return confusableClass.filter(isPairingCodeAlphabetMember);
}
/**
 * Normalises a code typed by a person, or refuses it by name.
 *
 * Refusing is a first-class outcome here, which is the difference from the seat
 * code: the cost of a refusal is one retry on a remote control, so pointing at
 * the offending position beats guessing.
 */
export function normalizePairingCodeInput(raw) {
    const typed = raw.toUpperCase().replace(/[\s.-]/g, '');
    for (const character of typed) {
        if (PAIRING_CODE_AMBIGUOUS_GLYPHS.includes(character)) {
            throw new DomainError({
                code: 'pairing_code.ambiguous_glyph',
                params: { glyph: character, position: String(typed.indexOf(character) + 1) },
            });
        }
    }
    return [...typed].map((character) => PAIRING_CODE_NORMALISATION[character] ?? character).join('');
}
export function isPairingCode(value) {
    if (value.length !== PAIRING_CODE_LENGTH)
        return false;
    return [...value].every(isPairingCodeAlphabetMember);
}
//# sourceMappingURL=pairing-code.js.map