/**
 * The IN / OUT asymmetry: a vocabulary is validated STRICTLY on the way in and
 * TOLERANTLY on the way out, as two schemas rather than one read twice.
 *
 * ⚠ The OUT side is why the TV fleet survives. A store review is slow, so a version
 * published today runs in living rooms a year from now and will receive the 22nd
 * discipline. A strict `z.enum` does not degrade a card — it fails the WHOLE payload
 * the card sits in (`storefront-tv` Q12, and the one requirement here whose failure
 * cannot be fixed remotely). Strictness belongs to the SHAPE, never to a member.
 *
 * ⚠ The IN side is strict for the mirror reason: an accepted unknown member is a
 * value no rule can evaluate, and it will be stored.
 */
import { z } from 'zod';
type Members = readonly [string, ...string[]];
/**
 * The type annotation for a STRICT vocabulary schema.
 *
 * ⚠ It derives the annotation from the vocabulary. Spelling
 * `z.ZodEnum<{ NO_SEAT: 'NO_SEAT'; … }>` at each call site — and `isolatedDeclarations`
 * demands an annotation there — restates the members in a type position: E2, in the
 * one place nobody would grep for it.
 */
export type VocabularyIn<T extends Members> = z.ZodEnum<{
    [K in T[number]]: K;
}>;
/**
 * The type annotation for a TOLERANT vocabulary schema — a plain string at runtime.
 *
 * ⚠ It takes no type parameter deliberately. `VocabularyOut<typeof CHAT_MODES>` would
 * claim the type carries the members; it cannot, so nothing would catch
 * `VocabularyOut<typeof TAX_EVIDENCE_KINDS> = vocabularyOut(TAX_SUPPLY_KINDS)`.
 */
export type VocabularyOut = z.ZodString;
/** A tolerant vocabulary that may also be absent. */
export type VocabularyOutNullable = z.ZodNullable<z.ZodString>;
/** A vocabulary schema, STRICT — for a request: an unknown member is refused. */
export declare function vocabularyIn<const T extends Members>(values: T): VocabularyIn<T>;
/**
 * The `source: none` marker, for a call site attaching its reason through its own `.meta()`.
 *
 * ⚠ `vocabularyOutLocal` is the preferred form; this is the escape hatch. The function
 * makes the reason mandatory and this constant cannot, so a call site using it can emit
 * `source: none` with nothing saying why — the false declaration D-065 §B is about. It
 * exists because three `@arthome/contracts` call sites chain `.meta()` with an `examples`
 * key beside the reason, and rewriting them mechanically failed three times against a
 * formatter that reflowed the code between attempts.
 */
export declare const VOCABULARY_SOURCE_LOCAL: string;
/**
 * A vocabulary schema, TOLERANT — for a response: an unknown member is kept as a raw string.
 *
 * ⚠ This was `z.union([z.enum(values), z.string()])`, above a comment claiming the union
 * let a surface `switch` exhaustively. Measured false — TypeScript reduces a literal union
 * with a `string` arm to `string`, and `(string & {})` does not rescue it:
 *
 *     type U = 'open' | 'emoji' | string;
 *     type C = string extends U ? 'collapses' : 'keeps literals';  // 'collapses'
 *
 * Nor did it buy anything emitted: `anyOf: [{type: string, enum: […]}, {type: string}]`,
 * whose second branch accepts everything. The known members travel as metadata instead,
 * under the key `check-vocabulary` already reads.
 */
export declare function vocabularyOut<const T extends Members>(values: T, name?: string): VocabularyOut;
/**
 * A vocabulary the DOCUMENT declares local to itself — `source: none`, with its reason.
 *
 * ⚠ The reason is mandatory: `source: none` without one is the false declaration D-065 §B
 * is about, "I could not find the name" wearing the appearance of a decision.
 */
export declare function vocabularyOutLocal<const T extends Members>(values: T, reason: string): VocabularyOut;
/** A contract-local vocabulary on a field that may also be absent. */
export declare function vocabularyOutLocalNullable<const T extends Members>(values: T, reason: string): VocabularyOutNullable;
/**
 * The name this vocabulary is published under, or the one the caller declares.
 *
 * ⚠ Derived from the export identifier, never transcribed — `vocabularyOut(WATCH_SCOPES,
 * 'WATCH_SCOPES')` is E2 in a single line. The map is keyed by ARRAY IDENTITY, so renaming the
 * export moves the emitted source name with it.
 *
 * ⚠ It matters because `check-vocabulary` indexes 121 blocks on `x-arthome-vocabulary-source`:
 * members without provenance leave it nothing to compare and it says PASS, and a gate silenced by
 * a generator never changes its verdict (D-065 §B). For the same reason an unknown vocabulary
 * throws rather than emitting `none`, which is a real value here.
 *
 * ⚠ It reads the `.` entry point, not `../vocabulary/`: the set to cover is the published surface
 * by definition, and the first version threw on `LOCALES`, declared in `format/` and published all
 * the same. No cycle — `check-core-entry` proves the `.` entry point never reaches zod.
 *
 * Exported because `@arthome/contracts` declares vocabularies of its own.
 */
export declare function sourceNameOf(values: readonly string[], name?: string): string;
/**
 * A tolerant vocabulary on a field that may be absent.
 *
 * ⚠ `vocabularyOut(V).nullable()` silently loses the vocabulary: `.nullable()` wraps the
 * already-annotated schema, so the metadata lands inside one branch of an `anyOf`.
 *
 *     vocabularyOut(V).nullable()   →  anyOf: [{type: string, x-arthome-…}, {type: null}]
 *     z.string().nullable().meta()  →  {type: [string, null], x-arthome-…}
 *
 * The first still VALIDATES correctly, which is what makes it dangerous: only the document
 * is wrong. `.optional()` does not wrap and has no such problem. Found by
 * `backend-contracts` on `.meta({format}).nullable()`.
 */
export declare function vocabularyOutNullable<const T extends Members>(values: T, name?: string): VocabularyOutNullable;
export {};
//# sourceMappingURL=vocabulary.d.ts.map