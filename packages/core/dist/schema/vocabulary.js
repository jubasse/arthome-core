/**
 * The IN / OUT asymmetry — the single most consequential rule in this module.
 *
 * A vocabulary is validated STRICTLY on the way in and TOLERANTLY on the way
 * out, and the two are different schemas rather than one schema read twice.
 *
 * ⚠ THE OUT SIDE IS WHY THE TV FLEET SURVIVES. A store review is slow: a
 * version published today runs in living rooms a year from now. The day the
 * catalogue gains a 22nd discipline, a new outcome or a new chat mode, THOSE
 * TELEVISIONS RECEIVE IT — and a strict `z.enum` does not degrade a card, it
 * fails the WHOLE PAYLOAD it sits in. Strictness belongs to the SHAPE (the
 * mandatory fields, the types), never to a vocabulary's MEMBER.
 *
 * In Protobuf this is native: an unknown member arrives as its number and fails
 * nothing. On the zod side it has to be written, because a bare `z.enum()` does
 * the opposite — which is `storefront-tv` Q12, and the one requirement in this
 * package whose failure cannot be fixed remotely.
 *
 * ⚠ THE IN SIDE IS STRICT FOR THE MIRROR REASON. A command that accepts an
 * unknown member has accepted a value no rule can evaluate, and it will be
 * stored. Tolerance on a read degrades a card; tolerance on a write corrupts a
 * record.
 */
import { z } from 'zod';
/**
 * STRICT — for a request. An unknown member is refused, with a code.
 */
export function vocabularyIn(values) {
    return z.enum(values);
}
/**
 * TOLERANT — for a response. An unknown member is KEPT as a raw string and
 * treated as neutral by the surface, never rejected.
 *
 * ⚠ THIS WAS `z.union([z.enum(values), z.string()])`, AND THE COMMENT ABOVE IT
 * CLAIMED THE UNION LET A SURFACE `switch` EXHAUSTIVELY ON A KNOWN MEMBER.
 * THAT CLAIM WAS FALSE. `backend-contracts` disproved it and I reproduced it:
 *
 *     type U = 'open' | 'emoji' | string;
 *     type C = string extends U ? 'collapses' : 'keeps literals';  // 'collapses'
 *
 * TypeScript reduces a literal union with a `string` arm to `string`, so there
 * was never a literal to keep, never an exhaustive switch, never a completion.
 * The `(string & {})` idiom does not rescue it either — I probed that too, and
 * `string extends 'open' | 'emoji' | (string & {})` is equally true.
 *
 * The union bought nothing in the emitted schema either: it produced
 * `anyOf: [{type: string, enum: […]}, {type: string}]`, whose second branch
 * accepts everything, so the enum branch constrained nothing. Forty lines
 * spelling `type: string`.
 *
 * So the union was validation-equivalent on the wire and type-equivalent in the
 * editor, and I had written a justification for a property neither artefact had.
 * I asserted rather than measured, in a module comment, which is worse than in a
 * message: a message gets answered and a module comment gets believed.
 *
 * What replaces it keeps every property the union was written for — any string
 * accepted, so the TV fleet survives a member added after its build shipped —
 * and emits the shape both contracts already carry in 154 blocks, with no
 * emitter logic to write and therefore none to get wrong.
 *
 * What is genuinely given up: `z.infer` produces `string` rather than
 * `'open' | 'emoji' | string`. Those are the same type, so nothing observable
 * is lost; the hover text is shorter and now honest.
 *
 * The known members do not disappear — they travel as metadata, under the key
 * `check-vocabulary` already reads, and remain discoverable by
 * `arthome-check-enums` at the call site because the vocabulary is passed by
 * name.
 */
export function vocabularyOut(values) {
    return z.string().meta({ 'x-arthome-vocabulary': values });
}
/**
 * TOLERANT AND NULLABLE — the same thing for a field that may be absent.
 *
 * ⚠ THIS EXISTS BECAUSE `vocabularyOut(V).nullable()` SILENTLY LOSES THE
 * VOCABULARY. `.meta()` is applied INSIDE `vocabularyOut`, so a later
 * `.nullable()` wraps the annotated schema and the metadata ends up inside one
 * branch of an `anyOf`:
 *
 *     vocabularyOut(V).nullable()   →  anyOf: [{type: string, x-arthome-…}, {type: null}]
 *     z.string().nullable().meta()  →  {type: [string, null], x-arthome-…}
 *
 * Only the second puts the key where the contracts carry it and where
 * `check-vocabulary` reads it. The first still VALIDATES correctly, which is
 * what makes it dangerous: the schema works, and only the document is wrong.
 *
 * `.optional()` does not have the problem — it does not wrap — so the hazard is
 * narrow and therefore easy to meet without expecting it. The ordering is
 * settled here rather than left to a call site, because a rule that depends on
 * the order of two chained calls that read identically is a rule that will be
 * broken by someone writing perfectly reasonable code.
 *
 * Found by `backend-contracts` on `.meta({format}).nullable()`, and it applies
 * here for the same reason.
 */
export function vocabularyOutNullable(values) {
    return z.string().nullable().meta({ 'x-arthome-vocabulary': values });
}
//# sourceMappingURL=vocabulary.js.map