import { z } from 'zod';
import { type VocabularyIn, type VocabularyOut } from './vocabulary.js';
import { LOCALES } from '../format/locale.js';
/**
 * An instant on the wire, STRICT — for one a client SENDS. `Z` only, at most three decimals.
 *
 * ⚠ Never `z.date()`: inconvertible to JSON Schema, and a `Date` is a parsed value, not a wire one.
 *
 * ⚠ The pattern is narrower than `format: date-time` and published nowhere — 125 of the 132
 * instants in the two contracts carry `format` alone, and RFC 3339 admits the offset this refuses.
 * It applies only to the 13 request occurrences over five names (`startsAt`, `expiresAt` twice
 * each, `muteUntil`, `rescheduledTo`, `measuredAt`); elsewhere it would bind the server's own
 * output. While the name did not state its direction, ten modules wrote their own `instant()` to
 * escape it (D-065 §H).
 */
export declare const InstantIn: z.ZodString;
/** The same instant as a server SENDS it: the format, and no pattern. */
export declare const InstantOut: z.ZodString;
/**
 * A server-issued identifier on the wire — `format: uuid`, no pattern.
 *
 * ⚠ The v7 pattern the branded `*IdSchema` exports demand stays unpublished: all 37 identifiers in
 * request bodies echo one a server issued, so a malformed one is an id that does not exist.
 */
export declare const uuidOut: () => z.ZodString;
/**
 * A 64-bit integer on the wire: `type: integer, format: int64`, and no bounds.
 *
 * ⚠ Not `z.int()`, which emits JavaScript's safe range as `minimum`/`maximum` and tells a client
 * generated in another language that int64 stops at 2^53. The refinement keeps it at runtime.
 */
export declare const int64: () => z.ZodNumber;
/**
 * An IANA time zone identifier: `Europe/Paris`. Validated by shape, never existence — the database
 * would cost hundreds of kilobytes in five applications — and it refuses the two forms D3 replaces.
 */
export declare const IanaTimeZoneSchema: z.ZodString;
/** ISO 4217, uppercase. The contract never transports a symbol or a position. */
export declare const CurrencyCodeSchema: z.ZodString;
/** ISO 3166-1 alpha-2, uppercase. */
export declare const CountryCodeSchema: z.ZodString;
/**
 * BCP 47, short form, STRICT — for a locale that arrives on a request.
 *
 * ⚠ There is no `LocaleSchema` any more: under that name it was the only locale schema, so a
 * RESPONSE field used it and emitted `enum: ['fr','en']` — a third content language then makes a
 * television reject the whole payload (critical rule 10). The cause was the absent counterpart, so
 * an alias would keep the trap open where a removed export is a compile error (D-065 §H).
 */
export declare const LocaleIn: VocabularyIn<typeof LOCALES>;
/** The same vocabulary, TOLERANT — for a locale a server serves: an unknown member is kept. */
export declare const LocaleOut: VocabularyOut;
/** Lowercase, hyphenated, no leading or trailing hyphen. */
export declare const SlugSchema: z.ZodString;
/**
 * An opaque Base64 cursor over `(created_at, id)`. Opaque is the point: a client that can read one
 * will build one, and then the server cannot change its ordering. A stale one is refused with
 * `CURSOR_TOO_OLD` rather than silently restarting the page (D-010).
 */
export declare const PageCursorSchema: z.ZodString;
//# sourceMappingURL=primitives.d.ts.map