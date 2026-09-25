/**
 * The boundary primitives. The rules governing all of them are stated in `index.ts`.
 */

import { z } from 'zod';

import {
  vocabularyIn,
  vocabularyOut,
  type VocabularyIn,
  type VocabularyOut,
} from './vocabulary.js';
import { LOCALES } from '../format/locale.js';

/**
 * An instant on the wire, STRICT — for one a client SENDS. `Z` only, at most three decimals.
 *
 * ⚠ Never `z.date()`: inconvertible to JSON Schema, and a `Date` is a parsed value, not a wire one.
 *
 * ⚠ The pattern is narrower than `format: date-time` and published nowhere — 125 of the 132
 * instants in the two contracts carry `format` alone. RFC 3339 admits an offset and this does
 * not, so `2026-09-24T20:00:00+02:00` is refused by a rule the contract never stated. It applies
 * only to the 13 request occurrences over five names (`startsAt`, `expiresAt` twice each,
 * `muteUntil`, `rescheduledTo`, `measuredAt`); elsewhere it would constrain the server's output.
 * While the name did not state its direction, ten modules wrote their own `instant()` to escape
 * a pattern their document did not carry (D-065 §H).
 */
export const InstantIn: z.ZodString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/)
  .meta({ format: 'date-time' });

/** The same instant as a server SENDS it: the format, and no pattern. */
export const InstantOut: z.ZodString = z.string().meta({ format: 'date-time' });

/**
 * A server-issued identifier on the wire — `format: uuid`, no pattern.
 *
 * ⚠ The v7 pattern the branded `*IdSchema` exports demand is deliberately unpublished: all 37
 * identifiers in request bodies echo something a server issued, and a malformed one is an id that
 * does not exist, which the lookup says more clearly than a pattern would.
 */
export const uuidOut = (): z.ZodString => z.string().meta({ format: 'uuid' });

/**
 * A 64-bit integer on the wire: `type: integer, format: int64`, and no bounds.
 *
 * ⚠ Not `z.int()`, which emits JavaScript's safe range as `minimum`/`maximum` — numbers in
 * no document, telling a generated client in another language that int64 stops at 2^53.
 * The refinement keeps that guarantee at runtime, where it costs the document nothing.
 */
export const int64 = (): z.ZodNumber =>
  z
    .number()
    .refine((value) => Number.isSafeInteger(value))
    .meta({ type: 'integer', format: 'int64' });

/**
 * An IANA time zone identifier: `Europe/Paris`. Validated by shape, never existence — the IANA
 * database would cost hundreds of kilobytes in five applications — and it refuses the two forms
 * D3 replaces, an abbreviation (`CEST`) and an offset (`+02:00`).
 */
export const IanaTimeZoneSchema: z.ZodString = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9_+-]*(?:\/[A-Za-z0-9_+-]+)+$/);

/** ISO 4217, uppercase. The contract never transports a symbol or a position. */
export const CurrencyCodeSchema: z.ZodString = z.string().regex(/^[A-Z]{3}$/);

/** ISO 3166-1 alpha-2, uppercase. */
export const CountryCodeSchema: z.ZodString = z.string().regex(/^[A-Z]{2}$/);

/**
 * BCP 47, short form, STRICT — for a locale that arrives on a request.
 *
 * ⚠ There is no `LocaleSchema` any more, deliberately. Under that name it was the only
 * locale schema there was, so `LocalizedText.contentLanguage` — a RESPONSE field — used it
 * and emitted `enum: ['fr','en']`; the day a third content language is authored, a
 * television rejects the whole payload the text sits in (critical rule 10). The cause was
 * the absent counterpart, not a careless call site, so an alias would keep the trap open
 * under a familiar name where a removed export is a compile error (D-065 §H).
 */
export const LocaleIn: VocabularyIn<typeof LOCALES> = vocabularyIn(LOCALES);

/** The same vocabulary, TOLERANT — for a locale a server serves: an unknown member is kept. */
export const LocaleOut: VocabularyOut = vocabularyOut(LOCALES);

/** Lowercase, hyphenated, no leading or trailing hyphen. */
export const SlugSchema: z.ZodString = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/**
 * An opaque Base64 cursor over `(created_at, id)`. Opaque is the point: a client that can read one
 * will build one, and then the server cannot change its ordering. A stale cursor is refused with
 * `CURSOR_TOO_OLD` rather than silently restarting the page (D-010).
 */
export const PageCursorSchema: z.ZodString = z.string().regex(/^[A-Za-z0-9_-]+=*$/);
