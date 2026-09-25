/**
 * The boundary primitives — the shapes every other schema is built from. The
 * rules that govern all of them (zod's cost and the gate that contains it, no
 * transforms, codes rather than zod messages, the explicit annotations) are
 * stated once in `index.ts`.
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
 * An instant on the wire, STRICT — for one a client SENDS. `Z` only, at most
 * three decimals.
 *
 * ⚠ NEVER `z.date()`: inconvertible to JSON Schema, and a `Date` is a parsed
 * value rather than a wire one. D7 is the same lesson from the other side — the
 * mockup's relative offsets were convenient and untransportable.
 *
 * ⚠ THE PATTERN IS NARROWER THAN `format: date-time` AND WAS PUBLISHED NOWHERE:
 * 126 of the 132 instants in the two contracts carry `format` and no pattern.
 * RFC 3339 admits an offset and this does not, so a studio in Paris sending
 * `2026-09-24T20:00:00+02:00` is refused by a rule the contract never stated. It
 * matters on the seven fields a client sends rather than echoes — `startsAt`,
 * `muteUntil`, `expiresAt`, `rescheduledTo`, `measuredAt`; on the other 119 it
 * would constrain the server's own output, which is not a promise a client can
 * break.
 *
 * ⚠ THE NAME STATES ITS DIRECTION BECAUSE THE UNNAMED ONE WAS USED IN THE WRONG
 * ONE: while this was the only instant export, ten modules wrote their own
 * stripped-down `instant()` because the one on offer carried a pattern their
 * document did not (D-065 §H).
 */
export const InstantIn: z.ZodString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/)
  .meta({ format: 'date-time' });

/** The same instant as a server SENDS it: the format, and no pattern. */
export const InstantOut: z.ZodString = z.string().meta({ format: 'date-time' });

/**
 * A server-issued identifier ON THE WIRE — `format: uuid`, no pattern.
 *
 * ⚠ THE v7 PATTERN IS NOT PUBLISHED, AND THAT IS MEASURED RATHER THAN LAZY. The
 * branded `*IdSchema` exports demand UUIDv7 because the outbox's ordering depends
 * on it, but a client never mints one: all 37 identifiers in request bodies echo
 * something a server issued, and `POST /v1/devices` takes no `deviceId`. A
 * malformed one is an id that does not exist, and the lookup says so more clearly
 * than a pattern would.
 */
export const uuidOut = (): z.ZodString => z.string().meta({ format: 'uuid' });

/**
 * A 64-bit integer on the wire: `type: integer, format: int64`, and NO bounds.
 *
 * ⚠ NOT `z.int()`, which emits JavaScript's safe range as `minimum` and `maximum`
 * — numbers that are in no document, and that would tell a generated client in
 * another language that int64 stops at 2^53. The refinement keeps the guarantee
 * those bounds would have given, at runtime, where it costs the document nothing.
 */
export const int64 = (): z.ZodNumber =>
  z
    .number()
    .refine((value) => Number.isSafeInteger(value))
    .meta({ type: 'integer', format: 'int64' });

/**
 * An IANA time zone identifier: `Europe/Paris`.
 *
 * Validated by SHAPE, never by existence — the IANA database is not bundled, and
 * bundling it would cost hundreds of kilobytes in five applications. This refuses
 * the two forms D3 replaces: an abbreviation (`CEST`) and an offset (`+02:00`).
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
 * ⚠ BUILT FROM `LOCALES`, never written out. The first draft was
 * `z.enum(['fr', 'en'])` and `arthome-check-enums` refused it inside the minute:
 * a hand-written vocabulary in the module whose whole job is carrying vocabularies
 * to the boundary.
 *
 * ⚠ AND THERE IS NO `LocaleSchema` ANY MORE, DELIBERATELY. Under that name it was
 * the only locale schema there was, so `@arthome/contracts`'
 * `LocalizedText.contentLanguage` — a RESPONSE field — used it and emitted
 * `enum: ['fr','en']`. The day a third content language is authored, a television
 * rejects the whole payload the text sits in: critical rule 10, broken on the
 * member while honoured on the shape. The cause was the absent counterpart rather
 * than a careless call site — the three `vocabularyIn` sites in `tax.ts` are all
 * `…In` with an `…Out` beside them; this one was `…Schema` with none, so the
 * nearest available name was the wrong direction. An alias would keep the trap
 * open under a familiar name, where a removed export is a compile error at every
 * site that has to choose again (D-065 §H).
 */
export const LocaleIn: VocabularyIn<typeof LOCALES> = vocabularyIn(LOCALES);

/**
 * The same vocabulary, TOLERANT — for a locale a server SERVES. An unknown member
 * is kept as a raw string and treated as neutral, never rejected: a store review
 * is slow and a television runs a year-old build.
 */
export const LocaleOut: VocabularyOut = vocabularyOut(LOCALES);

/** Lowercase, hyphenated, no leading or trailing hyphen. */
export const SlugSchema: z.ZodString = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/**
 * An opaque Base64 cursor over `(created_at, id)`.
 *
 * Opaque is the point: a client that can read a cursor will eventually build one,
 * and then the server cannot change its ordering without breaking it. Shape only,
 * and a stale one is refused with `CURSOR_TOO_OLD` rather than silently restarting
 * the page (D-010).
 */
export const PageCursorSchema: z.ZodString = z.string().regex(/^[A-Za-z0-9_-]+=*$/);
