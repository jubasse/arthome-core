/**
 * A vocabulary is validated strictly on the way in and tolerantly on the way out, as two schemas.
 *
 * A strict `z.enum` does not degrade a card, it fails the whole payload the card sits in — and a
 * television on a year-old build will receive the 22nd discipline (`storefront-tv` Q12). Strictness
 * belongs to the shape, never to a member. In is strict for the mirror reason: an accepted unknown
 * member is a value no rule can evaluate, and it will be stored.
 */
import { z } from 'zod';
type Members = readonly [string, ...string[]];
/**
 * The annotation for a strict vocabulary schema, derived from the vocabulary.
 *
 * `isolatedDeclarations` demands an annotation at each call site, and spelling it
 * (`z.ZodEnum<{ NO_SEAT: 'NO_SEAT'; … }>`) restates the members in a type position: E2, where
 * nobody greps.
 */
export type VocabularyIn<T extends Members> = z.ZodEnum<{
    [K in T[number]]: K;
}>;
/**
 * The annotation for a tolerant vocabulary schema — a plain string at runtime.
 *
 * No type parameter, deliberately: `VocabularyOut<typeof CHAT_MODES>` would claim the type
 * carries the members, so nothing would catch a mismatched pair on one line.
 */
export type VocabularyOut = z.ZodString;
/** A tolerant vocabulary that may also be absent. */
export type VocabularyOutNullable = z.ZodNullable<z.ZodString>;
/** A vocabulary schema, STRICT — for a request: an unknown member is refused. */
export declare function vocabularyIn<const T extends Members>(values: T): VocabularyIn<T>;
/**
 * The `source: none` marker, for a call site attaching its reason through its own `.meta()`.
 *
 * The escape hatch, not an alternative to `vocabularyOutLocal`, which makes the reason
 * mandatory as this cannot — `source: none` with no reason is the false declaration D-065 §B is
 * about. It exists for three `@arthome/contracts` call sites whose mechanical rewrite failed three
 * times against a formatter that reflowed the code between attempts.
 */
export declare const VOCABULARY_SOURCE_LOCAL: string;
/**
 * A vocabulary schema, TOLERANT — for a response: an unknown member is kept as a raw string.
 *
 * This was a union with `z.string()`, claimed to keep the literals for an exhaustive `switch`.
 * Measured false, and `(string & {})` does not rescue it:
 *
 *     type U = 'open' | 'emoji' | string;
 *     type C = string extends U ? 'collapses' : 'keeps literals';  // 'collapses'
 *
 * It bought nothing emitted either: the second branch of `anyOf: [{enum: […]}, {type: string}]`
 * accepts everything. The members travel as metadata, under the key `check-vocabulary` reads.
 */
export declare function vocabularyOut<const T extends Members>(values: T, name?: string): VocabularyOut;
/**
 * A vocabulary the document declares local to itself — `source: none`, with its reason, which is
 * mandatory: without one it is "I could not find the name" wearing a decision's appearance.
 */
export declare function vocabularyOutLocal<const T extends Members>(values: T, reason: string): VocabularyOut;
/** A contract-local vocabulary on a field that may also be absent. */
export declare function vocabularyOutLocalNullable<const T extends Members>(values: T, reason: string): VocabularyOutNullable;
/**
 * The name this vocabulary is published under, or the one the caller declares. Exported because
 * `@arthome/contracts` declares vocabularies of its own.
 *
 * Derived from the export identifier by ARRAY IDENTITY, never transcribed:
 * `vocabularyOut(WATCH_SCOPES, 'WATCH_SCOPES')` is E2 in one line. It matters because
 * `check-vocabulary` indexes 121 blocks on `x-arthome-vocabulary-source`, and members without
 * provenance leave it nothing to compare, so it says PASS (D-065 §B). An unknown vocabulary throws
 * for the same reason rather than emitting `none`, which is a real value.
 *
 * It reads the `.` entry point, not `../vocabulary/`, because the set to cover is the published
 * surface: the first version threw on `LOCALES`, declared in `format/` and published all the same.
 * Not a cycle — `check-core-entry` proves the `.` entry point never reaches zod, so never this file.
 */
export declare function sourceNameOf(values: readonly string[], name?: string): string;
/**
 * A tolerant vocabulary on a field that may be absent.
 *
 * `vocabularyOut(V).nullable()` silently loses it — `.nullable()` wraps the annotated schema, so
 * the metadata lands in one branch of an `anyOf`, and the schema still VALIDATES correctly, which
 * is what makes it dangerous: only the document is wrong. `.optional()` does not wrap.
 *
 *     vocabularyOut(V).nullable()   →  anyOf: [{type: string, x-arthome-…}, {type: null}]
 *     z.string().nullable().meta()  →  {type: [string, null], x-arthome-…}
 */
export declare function vocabularyOutNullable<const T extends Members>(values: T, name?: string): VocabularyOutNullable;
export {};
//# sourceMappingURL=vocabulary.d.ts.map