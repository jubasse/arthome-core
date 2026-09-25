/**
 * The IN / OUT asymmetry — the single most consequential rule in this module. A
 * vocabulary is validated STRICTLY on the way in and TOLERANTLY on the way out,
 * and the two are different schemas rather than one schema read twice.
 *
 * ⚠ THE OUT SIDE IS WHY THE TV FLEET SURVIVES. A store review is slow: a version
 * published today runs in living rooms a year from now. The day the catalogue
 * gains a 22nd discipline, a new outcome or a new chat mode, THOSE TELEVISIONS
 * RECEIVE IT — and a strict `z.enum` does not degrade a card, it fails the WHOLE
 * PAYLOAD it sits in. Strictness belongs to the SHAPE (the mandatory fields, the
 * types), never to a vocabulary's MEMBER. Protobuf gets this natively, an unknown
 * member arriving as its number; on the zod side it has to be written, because a
 * bare `z.enum()` does the opposite — `storefront-tv` Q12, and the one
 * requirement here whose failure cannot be fixed remotely.
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
 * ⚠ DERIVES THE ANNOTATION FROM THE VOCABULARY, which is the point. Spelling
 * `z.ZodEnum<{ NO_SEAT: 'NO_SEAT'; … }>` by hand at each call site — and
 * `isolatedDeclarations` demands an annotation there (see `index.ts`) — would
 * restate the members: a parallel literal table in a type position, which is the
 * fault this package exists to prevent, in the one place nobody would grep for
 * it. A member added to the `as const` list propagates with nothing to keep in
 * step.
 */
export type VocabularyIn<T extends Members> = z.ZodEnum<{
    [K in T[number]]: K;
}>;
/**
 * ⚠ TAKES NO TYPE PARAMETER, AND THE ABSENCE IS DELIBERATE.
 * `VocabularyOut<typeof CHAT_MODES>` would read as though the type carried the
 * members. It cannot — the runtime type is `string`, see `vocabularyOut` — so the
 * parameter would be a claim the annotation does not keep, and nothing would catch
 * `VocabularyOut<typeof TAX_EVIDENCE_KINDS> = vocabularyOut(TAX_SUPPLY_KINDS)`.
 * That is a transcription, the exact fault this module was written against.
 *
 * The name still earns its place: it tells a reader this string is an OPEN
 * VOCABULARY rather than free text. Which vocabulary is stated once, in the call
 * on the same line, where `arthome-check-enums` can see it.
 */
export type VocabularyOut = z.ZodString;
/** A tolerant vocabulary that may also be absent — see `vocabularyOutNullable`. */
export type VocabularyOutNullable = z.ZodNullable<z.ZodString>;
/** STRICT — for a request. An unknown member is refused, with a code. */
export declare function vocabularyIn<const T extends Members>(values: T): VocabularyIn<T>;
/**
 * The same marker, exported — for a call site that attaches its reason through its
 * own `.meta()` rather than through `vocabularyOutLocal`.
 *
 * ⚠ `vocabularyOutLocal` IS THE PREFERRED FORM and this is the escape hatch, not
 * an alternative: the function makes the reason MANDATORY and this constant
 * cannot, so a call site using it can still emit `source: none` with nothing
 * saying why — the false declaration D-065 §B is about. It exists because three
 * call sites in `@arthome/contracts` chain `.meta()` with an `examples` key beside
 * the reason, and rewriting them mechanically failed three times against a
 * formatter that reflowed the code between attempts. Spelling `'none'` in four
 * files instead was the worse of the two, because every one of those literals was
 * then reported as a copy of a vocabulary member — correctly.
 */
export declare const VOCABULARY_SOURCE_LOCAL: string;
/**
 * TOLERANT — for a response. An unknown member is KEPT as a raw string and treated
 * as neutral by the surface, never rejected.
 *
 * ⚠ THIS WAS `z.union([z.enum(values), z.string()])`, AND THE COMMENT ABOVE IT
 * CLAIMED THE UNION LET A SURFACE `switch` EXHAUSTIVELY ON A KNOWN MEMBER. THAT
 * CLAIM WAS FALSE, and I reproduced it:
 *
 *     type U = 'open' | 'emoji' | string;
 *     type C = string extends U ? 'collapses' : 'keeps literals';  // 'collapses'
 *
 * TypeScript reduces a literal union with a `string` arm to `string`, so there was
 * never a literal to keep, never an exhaustive switch, never a completion. The
 * `(string & {})` idiom does not rescue it either — `string extends 'open' |
 * 'emoji' | (string & {})` is equally true. Nor did the union buy anything in the
 * emitted schema: it produced `anyOf: [{type: string, enum: […]}, {type: string}]`,
 * whose second branch accepts everything, so the enum branch constrained nothing.
 * Forty lines spelling `type: string`. **I asserted rather than measured, in a
 * module comment — which is worse than in a message, because a message gets
 * answered and a module comment gets believed.**
 *
 * What is genuinely given up: `z.infer` produces `string` rather than
 * `'open' | 'emoji' | string`. Those are the same type, so nothing observable is
 * lost. The known members travel as metadata instead, under the key
 * `check-vocabulary` already reads.
 */
export declare function vocabularyOut<const T extends Members>(values: T, name?: string): VocabularyOut;
/**
 * A vocabulary the DOCUMENT declares local to itself — `source: none`, with the
 * reason the contract gives for it.
 *
 * ⚠ IT LIVES HERE BECAUSE FOUR FILES INVENTED IT SEPARATELY. Writing schemas for
 * the two contracts, four workers each needed the same thing — a vocabulary the
 * domain neither produces nor consumes, like a payment provider's state machine —
 * and each wrote `const LOCAL_VOCABULARY = 'none'` at the top of their file.
 * `arthome-check-enums` reported every one, correctly. *Four people reaching for
 * the same missing thing is the shape of an export that should exist.*
 *
 * ⚠ AND THE REASON IS MANDATORY, which the bare string was not. `source: none`
 * without one is the false declaration D-065 §B is about — "I could not find the
 * name" wearing the appearance of a decision.
 */
export declare function vocabularyOutLocal<const T extends Members>(values: T, reason: string): VocabularyOut;
/**
 * A contract-local vocabulary on a field that may also be absent. It exists for
 * the same reason `vocabularyOutNullable` does, and that reason is stated there.
 */
export declare function vocabularyOutLocalNullable<const T extends Members>(values: T, reason: string): VocabularyOutNullable;
/**
 * The name this vocabulary is published under, or the one the caller declares.
 *
 * ⚠ THE NAME IS DERIVED FROM THE EXPORT IDENTIFIER, NEVER TRANSCRIBED, AND THE
 * OBVIOUS ALTERNATIVE IS THE FAULT THIS PACKAGE EXISTS TO PREVENT.
 * `vocabularyOut(WATCH_SCOPES, 'WATCH_SCOPES')` writes an identifier into a string
 * beside itself — E2 in a single line, in the module that argues against E2. So
 * the name comes from the package's own export keys, and the map is keyed by ARRAY
 * IDENTITY, so `vocabularyOut(WATCH_SCOPES)` finds the name it was exported under.
 * Rename the export and the emitted source name follows: they are the same string.
 *
 * ⚠ WHY THIS MATTERS AT ALL: `check-vocabulary` compares 121 blocks and INDEXES
 * THEM ON `x-arthome-vocabulary-source`. A generated document carrying the members
 * without the provenance leaves it nothing to compare, and it says PASS. *A gate
 * silenced by a generator is worse than a gate that fails, because its verdict
 * does not change.* (D-065 §B.)
 *
 * ⚠ IT READS THE `.` ENTRY POINT, NOT `../vocabulary/`, AND THAT IS THE WHOLE
 * REGISTRY RATHER THAN A CONVENIENT ONE. `check-vocabulary`'s universe is every
 * vocabulary exported by every published package, so the set this map must cover
 * is the PUBLISHED SURFACE by definition; any narrower import is a second
 * definition that will drift. The first version read `../vocabulary/` and threw on
 * `LOCALES`, which is declared in `format/` and published all the same. There is
 * no import cycle, because `check-core-entry` proves the `.` entry point never
 * reaches zod and therefore never reaches this module.
 *
 * ⚠ AND AN UNKNOWN VOCABULARY THROWS RATHER THAN EMITTING `none`. `none` is a real
 * value in these documents — "local to this contract" — so defaulting to it would
 * turn "I could not find the name" into a legitimate-looking declaration. It fails
 * where it is written instead of in a document nobody diffs.
 *
 * Exported because `@arthome/contracts` declares vocabularies of its own —
 * `EMPTY_REASONS` is one.
 */
export declare function sourceNameOf(values: readonly string[], name?: string): string;
/**
 * TOLERANT AND NULLABLE — the same thing for a field that may be absent.
 *
 * ⚠ THIS EXISTS BECAUSE `vocabularyOut(V).nullable()` SILENTLY LOSES THE
 * VOCABULARY. `.meta()` is applied inside `vocabularyOut`, so a later `.nullable()`
 * wraps the annotated schema and the metadata lands inside one branch of an
 * `anyOf`:
 *
 *     vocabularyOut(V).nullable()   →  anyOf: [{type: string, x-arthome-…}, {type: null}]
 *     z.string().nullable().meta()  →  {type: [string, null], x-arthome-…}
 *
 * Only the second puts the key where the contracts carry it and where
 * `check-vocabulary` reads it. The first still VALIDATES correctly, which is what
 * makes it dangerous: the schema works, and only the document is wrong.
 * `.optional()` does not wrap and so does not have the problem, which is what
 * makes the hazard narrow enough to meet without expecting it. The ordering is
 * settled here rather than left to a call site, because a rule that depends on the
 * order of two chained calls that read identically will be broken by someone
 * writing perfectly reasonable code. Found by `backend-contracts` on
 * `.meta({format}).nullable()`.
 */
export declare function vocabularyOutNullable<const T extends Members>(values: T, name?: string): VocabularyOutNullable;
export {};
//# sourceMappingURL=vocabulary.d.ts.map