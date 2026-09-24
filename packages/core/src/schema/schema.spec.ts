import { describe, expect, it } from 'vitest';

import { ErrorEnvelopeSchema, issueToCode } from './error.js';
import { AccountIdSchema, PublicHandleSchema } from './identifiers.js';
import { MoneyIn, MoneyOut } from './money.js';
import { IanaTimeZoneSchema, InstantSchema, LocaleIn, LocaleOut } from './primitives.js';
import { vocabularyIn, vocabularyOut, vocabularyOutNullable } from './vocabulary.js';
import { DATE_OUTCOMES } from '../vocabulary/catalog.js';

/**
 * PROTECTED INVARIANT
 *   A vocabulary is STRICT on the way in and TOLERANT on the way out, and the
 *   two are different schemas.
 *
 * WHY THIS TEST EXISTS
 *   It is the one requirement in this package whose failure cannot be fixed
 *   remotely. A TV store review is slow: a version published today runs in
 *   living rooms a year from now, and the day the catalogue gains a new outcome
 *   those televisions receive it. A strict `z.enum` on a RESPONSE does not
 *   degrade a card — it fails the whole payload the card sits in.
 *
 *   A bare `z.enum()` does the wrong thing by default, which is why this is a
 *   test and not a note.
 */
describe('the in / out asymmetry', () => {
  const In = vocabularyIn(DATE_OUTCOMES);
  const Out = vocabularyOut(DATE_OUTCOMES);

  // NOTE ON WHAT THIS DOES *NOT* CLAIM
  //   The OUT schema does not preserve literal types. It once did in the
  //   comment above `vocabularyOut` and never did in fact: a `string` arm
  //   reduces the whole union to `string`, so there was no exhaustive switch to
  //   have. The tests below assert PARSING behaviour, which is the part that
  //   was always real and is the part the fleet depends on.
  it('accepts a known member on both sides', () => {
    expect(In.parse('cancelled')).toBe('cancelled');
    expect(Out.parse('cancelled')).toBe('cancelled');
  });

  it('REFUSES an unknown member on the way in — a write must not store it', () => {
    expect(In.safeParse('rescheduled_twice').success).toBe(false);
  });

  it('KEEPS an unknown member on the way out — the page must still render', () => {
    const result = Out.safeParse('rescheduled_twice');
    expect(result.success).toBe(true);
    // Kept verbatim, not coerced and not dropped: the surface can log it and
    // show a generic label rather than a raw code or nothing at all.
    expect(result.success && result.data).toBe('rescheduled_twice');
  });

  it('carries the known members as metadata, so nothing is lost by tolerating', () => {
    // The OUT side is a plain `z.string()`: the members cannot live in the type,
    // so they live in the metadata — under the key both contracts already carry
    // and `check-vocabulary` already reads. This is what makes the tolerant form
    // documentable instead of merely permissive.
    expect(Out.meta()?.['x-arthome-vocabulary']).toEqual(DATE_OUTCOMES);
  });

  it('keeps the vocabulary at the TOP LEVEL when the field is nullable', () => {
    // `vocabularyOut(V).nullable()` would bury it inside an `anyOf` branch,
    // where the contracts do not carry it and `check-vocabulary` does not read
    // it — while still validating correctly, which is what makes it worth a
    // constructor of its own rather than a note.
    const N = vocabularyOutNullable(DATE_OUTCOMES);
    expect(N.meta()?.['x-arthome-vocabulary']).toEqual(DATE_OUTCOMES);
    expect(N.safeParse(null).success).toBe(true);
    expect(N.safeParse('rescheduled_twice').success).toBe(true);
  });

  it('does not fail a PAYLOAD because one field carries the unknown', () => {
    // The exact defect feared: a page of cards where ONE has an unheard-of
    // value. The others must render.
    const page = ['cancelled', 'discipline_22', 'postponed'];
    expect(page.every((v) => Out.safeParse(v).success)).toBe(true);
  });
});

/**
 * WHERE THE STRUCTURAL RULES ARE ASSERTED, AND WHY NOT HERE
 *   Two of the three boundary rules — no `z.transform()`, no `z.date()` — are
 *   rules about what may be WRITTEN, not about what happens at runtime. The
 *   honest assertion is a scan of the sources, and the first draft of this file
 *   did exactly that with `node:fs`.
 *
 *   `tsc` refused it, correctly: `packages/core` sets `types: []` so that a
 *   Node API is unreachable from the package, and the spec shares that project.
 *   The test would have had to open a hole in the wall it was testing.
 *
 *   So they live in `tools/check-core-entry.mjs`, which already walks the
 *   import graph of this exact entry point, in Node, where reading a file is
 *   ordinary. Scoped to the modules REACHED from the entry point rather than to
 *   this directory: a file here that nothing imports sits at no boundary, and a
 *   boundary schema placed elsewhere and re-exported sits at one.
 *
 *   Verified by planting `z.string().transform(...)` in `money.ts`: the gate
 *   exits 1 and names the file and line.
 */

/**
 * PROTECTED INVARIANT
 *   A validation failure becomes a CODE, never a zod message in English.
 */
describe('failures leave as codes', () => {
  it('turns an issue into a code and parameters, keeping the field', () => {
    const result = MoneyIn.safeParse({ amountMinor: 1.5, currencyCode: 'EUR' });
    expect(result.success).toBe(false);
    if (result.success) return;
    const { code, params } = issueToCode(result.error.issues[0]!);
    expect(code).toMatch(/^validation\./);
    expect(params.field).toBe('amountMinor');
  });

  it('carries no English prose out of zod', () => {
    const result = InstantSchema.safeParse('2026-09-21 20:30');
    expect(result.success).toBe(false);
    if (result.success) return;
    const { code } = issueToCode(result.error.issues[0]!);
    // A code is a vocabulary; a message is a sentence. Only one can be
    // translated by the surface that has to show it.
    expect(code).not.toMatch(/\s/);
  });

  it('accepts the envelope every surface depends on', () => {
    expect(
      ErrorEnvelopeSchema.safeParse({
        code: 'publication.transition_irreversible',
        params: { from: 'scheduled', to: 'draft' },
        traceId: '00-4bf92f-00f067aa-01',
        nature: 'refused',
      }).success,
    ).toBe(true);
  });
});

/**
 * PROTECTED INVARIANT
 *   The primitives refuse the shapes the project has already been bitten by.
 */
describe('the primitives refuse what bit us before', () => {
  it('requires an instant in UTC, and refuses an offset spelling', () => {
    expect(InstantSchema.safeParse('2026-09-21T20:30:00.000Z').success).toBe(true);
    // Two spellings of one moment is the fault this package exists to prevent.
    expect(InstantSchema.safeParse('2026-09-21T22:30:00+02:00').success).toBe(false);
    expect(InstantSchema.safeParse('2026-09-21').success).toBe(false);
  });

  it('refuses the two time zone forms D3 replaced', () => {
    expect(IanaTimeZoneSchema.safeParse('Europe/Paris').success).toBe(true);
    expect(IanaTimeZoneSchema.safeParse('CEST').success).toBe(false);
    expect(IanaTimeZoneSchema.safeParse('+02:00').success).toBe(false);
  });

  it('refuses a v4 identifier, because v7 ordering is load-bearing', () => {
    // The outbox needs the aggregate to know its id before insertion, and the
    // temporal prefix is what fills a B-tree index well. A v4 would work
    // everywhere and degrade quietly, which is the worst failure available.
    expect(AccountIdSchema.safeParse('019928fa-0000-7000-8000-000000000001').success).toBe(true);
    expect(AccountIdSchema.safeParse('f47ac10b-58cc-4372-a567-0e02b2c3d479').success).toBe(false);
  });

  it('keeps money in whole minor units', () => {
    expect(MoneyOut.safeParse({ amountMinor: 2600, currencyCode: 'EUR' }).success).toBe(true);
    // Negative is legal — refunds and credit notes are money too.
    expect(MoneyOut.safeParse({ amountMinor: -2600, currencyCode: 'EUR' }).success).toBe(true);
    expect(MoneyOut.safeParse({ amountMinor: 26.5, currencyCode: 'EUR' }).success).toBe(false);
    expect(MoneyOut.safeParse({ amountMinor: 2600, currencyCode: 'eur' }).success).toBe(false);
  });

  it('is strict on a locale IN and tolerant on a locale OUT', () => {
    expect(LocaleIn.safeParse('fr').success).toBe(true);
    expect(LocaleIn.safeParse('de').success).toBe(false);
    // And the OUT side keeps it, which is the whole asymmetry: a television
    // must render a text whose language it has never heard of.
    expect(LocaleOut.safeParse('de').success).toBe(true);
  });

  it('exposes a handle, never an internal identifier', () => {
    expect(PublicHandleSchema.safeParse('@marie.j').success).toBe(true);
    expect(PublicHandleSchema.safeParse('019928fa-0000-7000-8000-000000000001').success).toBe(
      false,
    );
  });
});
