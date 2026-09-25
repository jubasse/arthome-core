import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ErrorSchema, issueToCode } from './error.js';
import { AccountIdSchema, PublicHandleSchema } from './identifiers.js';
import { MoneyIn, MoneyOut } from './money.js';
import { IanaTimeZoneSchema, InstantIn, LocaleIn, LocaleOut, int64 } from './primitives.js';
import { vocabularyIn, vocabularyOut, vocabularyOutNullable } from './vocabulary.js';
import { DATE_OUTCOMES } from '../vocabulary/catalog.js';

/**
 * ⚠ A vocabulary is strict IN and tolerant OUT, and a bare `z.enum()` does the
 * wrong thing by default. A version published today runs in living rooms a year
 * from now: a strict enum on a RESPONSE does not degrade one card, it fails the
 * whole payload the card sits in — and that cannot be fixed remotely.
 */
describe('the in / out asymmetry', () => {
  const In = vocabularyIn(DATE_OUTCOMES);
  const Out = vocabularyOut(DATE_OUTCOMES);

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
    expect(result.success && result.data).toBe('rescheduled_twice');
  });

  it('carries the known members as metadata, so nothing is lost by tolerating', () => {
    // The members cannot live in a `z.string()` type, so they live in the metadata
    // key the contracts carry and `check-vocabulary` reads.
    expect(Out.meta()?.['x-arthome-vocabulary']).toEqual(DATE_OUTCOMES);
  });

  it('keeps the vocabulary at the TOP LEVEL when the field is nullable', () => {
    // `vocabularyOut(V).nullable()` buries the vocabulary in an `anyOf` branch,
    // where the contracts do not carry it and `check-vocabulary` does not read it.
    const N = vocabularyOutNullable(DATE_OUTCOMES);
    expect(N.meta()?.['x-arthome-vocabulary']).toEqual(DATE_OUTCOMES);
    expect(N.safeParse(null).success).toBe(true);
    expect(N.safeParse('rescheduled_twice').success).toBe(true);
  });

  it('does not fail a PAYLOAD because one field carries the unknown', () => {
    const page = ['cancelled', 'discipline_22', 'postponed'];
    expect(page.every((v) => Out.safeParse(v).success)).toBe(true);
  });
});

/**
 * ⚠ The no-`z.transform()` and no-`z.date()` rules live in
 * `tools/check-core-entry.mjs`, not here: a source scan needs `node:fs`, which
 * `types: []` puts out of this spec's reach. Verified by planting a
 * `z.string().transform(...)` in `money.ts` — the gate exits 1 with file and line.
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
    const result = InstantIn.safeParse('2026-09-21 20:30');
    expect(result.success).toBe(false);
    if (result.success) return;
    // `!` is banned here (no-non-null-assertion) and `pnpm run fix` removes it,
    // which breaks the compile — hence the destructure.
    const [issue] = result.error.issues;
    if (issue === undefined) throw new Error('expected at least one issue');
    const { code } = issueToCode(issue);
    // A code is a vocabulary; a message is a sentence.
    expect(code).not.toMatch(/\s/);
  });

  it('accepts the envelope every surface depends on', () => {
    expect(
      ErrorSchema.safeParse({
        code: 'publication.transition_irreversible',
        params: { from: 'scheduled', to: 'draft' },
        traceId: '00-4bf92f-00f067aa-01',
        nature: 'refused',
      }).success,
    ).toBe(true);
  });
});

describe('the primitives refuse what bit us before', () => {
  it('requires an instant in UTC, and refuses an offset spelling', () => {
    expect(InstantIn.safeParse('2026-09-21T20:30:00.000Z').success).toBe(true);
    expect(InstantIn.safeParse('2026-09-21T22:30:00+02:00').success).toBe(false);
    expect(InstantIn.safeParse('2026-09-21').success).toBe(false);
  });

  it('refuses the two time zone forms D3 replaced', () => {
    expect(IanaTimeZoneSchema.safeParse('Europe/Paris').success).toBe(true);
    expect(IanaTimeZoneSchema.safeParse('CEST').success).toBe(false);
    expect(IanaTimeZoneSchema.safeParse('+02:00').success).toBe(false);
  });

  it('refuses a v4 identifier, because v7 ordering is load-bearing', () => {
    // The outbox needs the id before insertion and the temporal prefix fills a
    // B-tree well; a v4 would work everywhere and degrade quietly.
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
    expect(LocaleOut.safeParse('de').success).toBe(true);
  });

  it('exposes a handle, never an internal identifier', () => {
    expect(PublicHandleSchema.safeParse('@marie.j').success).toBe(true);
    expect(PublicHandleSchema.safeParse('019928fa-0000-7000-8000-000000000001').success).toBe(
      false,
    );
  });
});

describe('int64', () => {
  it('emits the format and no bounds, which is what the documents carry', () => {
    const emitted = z.toJSONSchema(int64(), { io: 'output' });
    expect(emitted).toMatchObject({ type: 'integer', format: 'int64' });
    expect(emitted).not.toHaveProperty('minimum');
    expect(emitted).not.toHaveProperty('maximum');
  });

  it('still refuses what a JavaScript number cannot carry', () => {
    expect(int64().safeParse(-3).success).toBe(true);
    expect(int64().safeParse(1.5).success).toBe(false);
    expect(int64().safeParse(2 ** 60).success).toBe(false);
  });

  it('emits the instant as a date-time carrying its pattern', () => {
    const emitted = z.toJSONSchema(InstantIn, { io: 'output' });
    expect(emitted).toMatchObject({ format: 'date-time' });
    expect(emitted).toHaveProperty('pattern');
  });
});
