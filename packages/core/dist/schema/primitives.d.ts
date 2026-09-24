/**
 * The boundary primitives — the shapes every other schema is built from.
 *
 * ⚠ THIS DIRECTORY IS THE ONLY ONE IN THE PACKAGE THAT MAY IMPORT ZOD, and
 * `tools/check-core-entry.mjs` enforces it in BOTH directions: it fails if any
 * import path from `.` reaches zod, and it fails if `./schema` exists and does
 * not. The cost is fixed and tied to the import — 93 KB gzipped for a single
 * `z.string()` on the classic entry point — so one `import { z }` in a rules
 * module hands the whole bill to the TV and to mobile with nothing reporting it
 * (D-012).
 *
 * THREE BOUNDARY RULES, AND THEY LIVE IN THE PACKAGE RATHER THAN IN A LOG.
 *
 * 1. NO `z.transform()` AT A BOUNDARY. A transform is inconvertible to JSON
 *    Schema, so the generated OpenAPI would describe a shape the API does not
 *    accept. A boundary schema validates; it does not reshape. Reshaping is the
 *    domain's job and it happens after the value is known good.
 *
 * 2. AN INPUT AND AN OUTPUT ARE TWO SCHEMAS, NOT ONE READ TWICE. They differ on
 *    purpose — see `vocabularyIn` / `vocabularyOut` below, where the difference
 *    is the whole survival strategy of the TV fleet.
 *
 * 3. A FAILURE BECOMES A CODE, NEVER A ZOD MESSAGE. zod's messages are English
 *    prose; surfacing one is an i18n leak, and the first place it leaks is a
 *    payment form. `issueToCode` is the only sanctioned way out.
 *
 * ⚠ AND A FOURTH, WHICH THE COMPILER IMPOSES RATHER THAN THE DESIGN.
 *    `isolatedDeclarations` refuses an exported schema whose type it cannot
 *    write without inferring through zod's builder chain, so **every exported
 *    schema carries an explicit annotation** — `z.ZodString`, `z.ZodEnum<…>`,
 *    `z.ZodObject<…>`. It is mechanical and it is not optional: without it the
 *    published `.d.ts` cannot be emitted at all.
 *
 *    It is the same constraint `core-port-plan.md` §6 predicted for the rules,
 *    arriving one wave later and biting harder, because a zod type is wider
 *    than a function signature. The upside is the same one: the shape a
 *    consumer sees is written down rather than inferred, so it cannot drift
 *    when a builder call is added in the middle of a chain.
 */
import { z } from 'zod';
import { type VocabularyIn, type VocabularyOut } from './vocabulary.js';
import { LOCALES } from '../format/locale.js';
/**
 * An instant on the wire: an ISO 8601 string in UTC.
 *
 * ⚠ NEVER `z.date()`. It is inconvertible to JSON Schema, so the emitted
 * OpenAPI could not describe it — and a `Date` is not a wire value anyway, it
 * is a parsed one. D7 is the same lesson from the other side: the mockup's
 * relative offsets were convenient and untransportable.
 *
 * The `Z` is required rather than tolerated. An offset-bearing instant would be
 * a second way to say the same moment, and two spellings of one value is the
 * fault this package exists to prevent.
 */
/**
 * ⚠ TWO FORMS, AND THE SPLIT IS THE IN/OUT ASYMMETRY APPLIED TO A FORMAT.
 *
 *   This pattern is NARROWER THAN `format: date-time`. RFC 3339 admits an
 *   offset; this admits `Z` only, and at most three decimals. That narrowing is
 *   real and it was published nowhere: 126 of the 132 instants in the two
 *   contracts carried `format` and no pattern.
 *
 *   It matters on exactly SEVEN fields — measured, not assumed — the ones a
 *   client SENDS rather than echoes: `startsAt`, `muteUntil`, `expiresAt`,
 *   `rescheduledTo`, `measuredAt`. A studio in Paris computing a start time
 *   produces `2026-09-24T20:00:00+02:00`, which is valid RFC 3339, valid
 *   `date-time`, and refused — by a rule the contract never stated.
 *
 *   On the other 119 the pattern constrains a server's own output, which is not
 *   a promise a client can break. Publishing it there would be noise on a field
 *   nobody can get wrong, and `format: date-time` is what a generated client
 *   reads.
 *
 *   *Strict on the way in, tolerant on the way out — the same asymmetry as the
 *   vocabularies, and the same naming as `LocaleIn`/`LocaleOut` and
 *   `MoneyIn`/`MoneyOut` (D-065 §H). A name that does not state its direction
 *   will be used in the wrong one, and this one was: ten modules wrote their own
 *   stripped-down `instant()` because the only export carried a pattern their
 *   document did not.*
 */
export declare const InstantIn: z.ZodString;
/** The same instant as a server SENDS it: the format, and no pattern. */
export declare const InstantOut: z.ZodString;
/**
 * A server-issued identifier as it appears ON THE WIRE — `format: uuid`, no
 * pattern.
 *
 * ⚠ THE v7 PATTERN IS NOT PUBLISHED, AND THAT IS MEASURED RATHER THAN LAZY.
 *   The branded `*IdSchema` exports demand UUIDv7 because the outbox's ordering
 *   depends on it. A client never mints one: `POST /v1/devices` takes no
 *   `deviceId` and returns it, and all 37 identifiers in request bodies are
 *   echoes of something a server issued. A malformed one is an id that does not
 *   exist, and the lookup says so more clearly than a pattern would.
 */
export declare const uuidOut: () => z.ZodString;
/**
 * A 64-bit integer on the wire: `type: integer, format: int64`, and NO bounds.
 *
 * ⚠ NOT `z.int()`. `z.int()` emits JavaScript's safe range as `minimum` and
 * `maximum` — numbers that are in no document, and that would tell a generated
 * client in another language that int64 stops at 2^53. The documents carry the
 * format and nothing else, so this emits exactly that.
 *
 * The runtime keeps the guarantee the bounds would have given: a value that is
 * not a safe integer is refused, because a JavaScript number cannot carry more
 * without losing digits silently.
 */
export declare const int64: () => z.ZodNumber;
/**
 * An IANA time zone identifier: `Europe/Paris`.
 *
 * Validated by SHAPE, never by existence — the IANA database is not bundled,
 * and bundling it would cost hundreds of kilobytes in five applications. This
 * refuses the two forms D3 replaces: an abbreviation (`CEST`) and a numeric
 * offset (`+02:00`).
 */
export declare const IanaTimeZoneSchema: z.ZodString;
/** ISO 4217, uppercase. The contract never transports a symbol or a position. */
export declare const CurrencyCodeSchema: z.ZodString;
/** ISO 3166-1 alpha-2, uppercase. */
export declare const CountryCodeSchema: z.ZodString;
/**
 * BCP 47, short form — the product's two languages.
 *
 * ⚠ Built from `LOCALES` rather than written out. The first draft of this line
 * was `z.enum(['fr', 'en'])`, and `arthome-check-enums` refused it within the
 * minute: a hand-written vocabulary in the module whose whole job is to carry
 * vocabularies to the boundary. It is `LOCALES` that has authority, and a
 * schema that restates it is the parallel literal table with a validator's
 * costume.
 *
 * ⚠ TWO EXPORTS, AND THE NAMES ARE THE MECHANISM RATHER THAN A STYLE.
 *
 *   This was one export called `LocaleSchema`, with the paragraph above
 *   explaining that it is strict because a locale arrives on a REQUEST. The
 *   paragraph was right and it was not enough: `@arthome/contracts`'
 *   `LocalizedText.contentLanguage` — a RESPONSE field — used it, because it was
 *   the only locale schema there was. It emitted `enum: ['fr','en']`, so the day
 *   a third content language is authored, a television rejects the whole payload
 *   the text sits in. Critical rule 10, broken on the member while honoured on
 *   the shape.
 *
 *   The cause was an absence, not a careless call site. Of the four
 *   `vocabularyIn` call sites in this package, the three in `tax.ts` are all
 *   named `…In` and all have an `…Out` beside them. This one was named
 *   `…Schema` and had no counterpart at all, so the nearest available name was
 *   the wrong direction.
 *
 *   **So there is no `LocaleSchema` any more, deliberately.** An alias would
 *   keep the trap open under a familiar name; a removed export is a compile
 *   error at every site that has to choose again. Found by the empty-diff gate
 *   on its first run — D-065 §H.
 */
export declare const LocaleIn: VocabularyIn<typeof LOCALES>;
/**
 * The same vocabulary, TOLERANT — for a locale a server SERVES.
 *
 * An unknown member is kept as a raw string and treated as neutral, never
 * rejected: a store review is slow and a television runs a year-old build.
 */
export declare const LocaleOut: VocabularyOut;
/** Lowercase, hyphenated, no leading or trailing hyphen. */
export declare const SlugSchema: z.ZodString;
/**
 * An opaque Base64 cursor over `(created_at, id)`.
 *
 * Opaque is the point: a client that can read a cursor will eventually build
 * one, and then the server cannot change its ordering without breaking it.
 * Validated for shape only, and a stale one is refused with `CURSOR_TOO_OLD`
 * rather than silently restarting the page (D-010).
 */
export declare const PageCursorSchema: z.ZodString;
//# sourceMappingURL=primitives.d.ts.map