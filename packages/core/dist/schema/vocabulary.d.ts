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
/** A non-empty vocabulary, the shape every `as const` list in this package has. */
type Members = readonly [string, ...string[]];
/**
 * The two annotations, exported as types.
 *
 * ⚠ `isolatedDeclarations` requires every exported schema to carry an explicit
 * type, and writing `z.ZodEnum<{ NO_SEAT: 'NO_SEAT'; … }>` by hand at each call
 * site would restate the members — a parallel literal table in a type position,
 * which is the fault this package exists to prevent, in the one place nobody
 * would grep for it.
 *
 * These derive the annotation FROM the vocabulary instead, so a member added to
 * the `as const` list propagates and there is nothing to keep in step.
 */
export type VocabularyIn<T extends Members> = z.ZodEnum<{
    [K in T[number]]: K;
}>;
/**
 * The OUT annotation takes NO type parameter, and the absence is deliberate.
 *
 * `VocabularyOut<typeof CHAT_MODES>` would read as though the type carried the
 * members. It cannot — see below, the runtime type is `string` — so the
 * parameter would be a claim the annotation does not keep, and nothing would
 * catch `VocabularyOut<typeof TAX_EVIDENCE_KINDS> = vocabularyOut(TAX_SUPPLY_KINDS)`.
 * That is a transcription, the exact fault this module was written against.
 *
 * The name still earns its place: it tells a reader this string is an OPEN
 * VOCABULARY rather than free text. The vocabulary it belongs to is stated once,
 * in the call on the same line, where `arthome-check-enums` can see it.
 */
export type VocabularyOut = z.ZodString;
/** A tolerant vocabulary that may also be absent — see `vocabularyOutNullable`. */
export type VocabularyOutNullable = z.ZodNullable<z.ZodString>;
/**
 * STRICT — for a request. An unknown member is refused, with a code.
 */
export declare function vocabularyIn<const T extends Members>(values: T): VocabularyIn<T>;
export declare function vocabularyOut<const T extends Members>(values: T, name?: string): VocabularyOut;
/**
 * The name this vocabulary is published under, or the one the caller declares.
 *
 * Exported because `@arthome/contracts` declares vocabularies of its own —
 * `EMPTY_REASONS` is one, and `check-vocabulary`'s universe is every vocabulary
 * exported by every published package, not just core's.
 */
export declare function sourceNameOf(values: readonly string[], name?: string): string;
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
export declare function vocabularyOutNullable<const T extends Members>(values: T, name?: string): VocabularyOutNullable;
export {};
//# sourceMappingURL=vocabulary.d.ts.map