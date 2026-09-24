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

import * as PUBLISHED from '../index.js';

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
export type VocabularyIn<T extends Members> = z.ZodEnum<{ [K in T[number]]: K }>;

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
export function vocabularyIn<const T extends Members>(values: T): VocabularyIn<T> {
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
/**
 * THE SOURCE NAME IS DERIVED FROM THE EXPORT IDENTIFIER, NOT TRANSCRIBED.
 *
 * This helper used to emit `x-arthome-vocabulary` and nothing else, and that
 * omission would have silenced a different gate entirely. `check-vocabulary`
 * compares 121 blocks and INDEXES THEM ON `x-arthome-vocabulary-source`: a
 * generated document carrying the members without the provenance leaves it with
 * nothing to compare, and it says PASS. *A gate silenced by a generator is worse
 * than a gate that fails, because its verdict does not change.* (D-065 §B.)
 *
 * ⚠ THE OBVIOUS FIX IS THE FAULT THIS PACKAGE EXISTS TO PREVENT.
 *   `vocabularyOut(WATCH_SCOPES, 'WATCH_SCOPES')` writes an identifier into a
 *   string beside itself — E2 in a single line, in the module that argues
 *   against E2.
 *
 * So the name comes from THE PACKAGE'S OWN EXPORT KEYS. `Object.entries` on the
 * `.` entry point's namespace gives `['WATCH_SCOPES', [...]]`, and the map is
 * keyed by ARRAY IDENTITY, so `vocabularyOut(WATCH_SCOPES)` finds the name the
 * package exported it under. There is nothing to keep in step: rename the export
 * and the emitted source name follows, because they are the same string.
 *
 * ⚠ IT READS THE `.` ENTRY POINT, NOT `../vocabulary/`, AND THAT IS THE WHOLE
 *   REGISTRY RATHER THAN A CONVENIENT ONE. `check-vocabulary`'s universe is
 *   *every vocabulary exported by every published package* — so the set this map
 *   must cover is the PUBLISHED SURFACE, by definition, and any narrower import
 *   is a second definition of the same set that will drift from it. The first
 *   version read `../vocabulary/` and threw on `LOCALES`, which is declared in
 *   `format/` and published all the same.
 *
 *   There is no import cycle, and the reason is a guarantee that already exists:
 *   `check-core-entry` proves the `.` entry point never reaches zod, therefore
 *   never reaches this module.
 *
 * ⚠ AND AN UNKNOWN VOCABULARY THROWS RATHER THAN EMITTING `none`.
 *   `none` is a real value in these documents — it means "local to this
 *   contract" — so defaulting to it would turn "I could not find the name" into
 *   a legitimate-looking declaration, which is precisely the false declaration
 *   D-065 §B is about. A contract-local vocabulary passes its own name; anything
 *   else is a mistake, and it fails where it is written instead of in a document
 *   nobody diffs.
 */
/**
 * The one place the marker is spelled. `arthome-check-enums` has a single
 * allow entry for this line, because `none` is also a member of five domain
 * vocabularies and no gate can tell an annotation value from one of them.
 */
const LOCAL_SOURCE = 'none';

/**
 * The same marker, exported — for a call site that attaches its reason through
 * its own `.meta()` rather than through `vocabularyOutLocal`.
 *
 * ⚠ `vocabularyOutLocal` IS THE PREFERRED FORM and this is the escape hatch, not
 *   an alternative. The function makes the reason MANDATORY; this constant
 *   cannot, so a call site using it can still emit `source: none` with nothing
 *   saying why — the false declaration D-065 §B is about.
 *
 *   It exists because three call sites in `@arthome/contracts` chain `.meta()`
 *   with an `examples` key beside the reason, and rewriting them mechanically
 *   failed three times against a formatter that reflowed the code between
 *   attempts. Spelling `'none'` in four files to avoid that was the worse of the
 *   two: `none` is a member of five domain vocabularies, so every one of those
 *   literals was reported as a copy, correctly, by a gate that cannot tell an
 *   annotation value from a vocabulary member.
 */
export const VOCABULARY_SOURCE_LOCAL: string = LOCAL_SOURCE;

const NAME_OF = new Map<readonly string[], string>();
for (const [name, value] of Object.entries(PUBLISHED)) {
  if (Array.isArray(value) && value.every((member) => typeof member === 'string')) {
    NAME_OF.set(value, name);
  }
}

export function vocabularyOut<const T extends Members>(values: T, name?: string): VocabularyOut {
  return z.string().meta({
    'x-arthome-vocabulary': values,
    'x-arthome-vocabulary-source': sourceNameOf(values, name),
  });
}

/**
 * A vocabulary the DOCUMENT declares local to itself — `source: none`, with the
 * reason the contract gives for it.
 *
 * ⚠ IT LIVES HERE BECAUSE FOUR FILES INVENTED IT SEPARATELY. Writing schemas for
 *   the two contracts, four workers each needed the same thing — a vocabulary
 *   the domain neither produces nor consumes, like a payment provider's state
 *   machine — and each wrote `const LOCAL_VOCABULARY = 'none'` at the top of
 *   their file. Four copies of one marker, and `arthome-check-enums` reported
 *   every one, correctly: `none` is a member of five core vocabularies, and it
 *   could not tell an annotation value from one of them.
 *
 *   *Four people reaching for the same missing thing is the shape of an export
 *   that should exist.*
 *
 * ⚠ AND THE REASON IS MANDATORY, which the bare string was not. `source: none`
 *   without one is the false declaration D-065 §B is about — "I could not find
 *   the name" wearing the appearance of a decision. The contract has to say why
 *   the domain owns nothing here.
 */
export function vocabularyOutLocal<const T extends Members>(
  values: T,
  reason: string,
): VocabularyOut {
  if (!reason.trim()) {
    throw new Error(
      'vocabularyOutLocal: a contract-local vocabulary must say WHY the domain owns nothing ' +
        'here. `source: none` with no reason is the false declaration this argument exists to ' +
        'prevent.',
    );
  }
  return z.string().meta({
    'x-arthome-vocabulary': values,
    'x-arthome-vocabulary-source': LOCAL_SOURCE,
    'x-arthome-vocabulary-reason': reason,
  });
}

/**
 * A contract-local vocabulary on a field that may also be absent.
 *
 * It exists for the same reason `vocabularyOutNullable` does: `.nullable()`
 * WRAPS, so `vocabularyOutLocal(V, why).nullable()` emits the annotation inside
 * `anyOf[0]`, where the contracts do not carry it and `check-vocabulary` does
 * not read it. The schema still validates correctly, which is what makes that
 * shape dangerous — the code works and only the document is wrong.
 */
export function vocabularyOutLocalNullable<const T extends Members>(
  values: T,
  reason: string,
): VocabularyOutNullable {
  const base = vocabularyOutLocal(values, reason);
  return z
    .string()
    .nullable()
    .meta(z.globalRegistry.get(base) ?? {});
}

/**
 * The name this vocabulary is published under, or the one the caller declares.
 *
 * Exported because `@arthome/contracts` declares vocabularies of its own —
 * `EMPTY_REASONS` is one, and `check-vocabulary`'s universe is every vocabulary
 * exported by every published package, not just core's.
 */
export function sourceNameOf(values: readonly string[], name?: string): string {
  const source = name ?? NAME_OF.get(values);
  if (source === undefined) {
    throw new Error(
      `vocabularyOut: [${values.slice(0, 3).join(', ')}…] is not exported by ` +
        '@arthome/core/vocabulary, so its source name cannot be derived. Pass the name ' +
        'explicitly if this vocabulary is local to a contract — and pass the identifier it ' +
        'is exported under, because check-vocabulary looks it up in the published packages.',
    );
  }
  return source;
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
export function vocabularyOutNullable<const T extends Members>(
  values: T,
  name?: string,
): VocabularyOutNullable {
  return z
    .string()
    .nullable()
    .meta({
      'x-arthome-vocabulary': values,
      'x-arthome-vocabulary-source': sourceNameOf(values, name),
    });
}
