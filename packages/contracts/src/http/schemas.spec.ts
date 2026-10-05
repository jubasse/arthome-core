import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import { ApiErrorCode } from '@arthome/core';
import { VOCABULARY_SOURCE_LOCAL, dateIn, dateTimeIn, vocabularyIn } from '@arthome/core/schema';

import { period, searchText } from './parameters.js';
import { Acknowledged, Deleted, localVocabulary, perishable } from './schemas.js';
import { StudioEnvelopeMetaSchema } from '../envelope/index.js';

const emitted = (schema: z.ZodType, io: 'input' | 'output' = 'output'): string =>
  JSON.stringify(z.toJSONSchema(schema, { io }));

const SECTIONS = ['overview', 'live'] as const;
const REASON = 'A screen composition the server decides.';

describe('Deleted and Acknowledged', () => {
  it('emit what the routes wrote inline', () => {
    const inlineDeleted = z.looseObject({ deleted: z.boolean().optional() }).optional();
    const inlineAccepted = z.looseObject({ accepted: z.boolean().optional() }).optional();
    expect(emitted(Deleted)).toBe(emitted(inlineDeleted));
    expect(emitted(Acknowledged)).toBe(emitted(inlineAccepted));
  });

  it('compose into the envelope like the inline data', () => {
    const through = (data: z.ZodType): string =>
      emitted(z.intersection(StudioEnvelopeMetaSchema, z.looseObject({ data })));
    const inline = z.looseObject({ deleted: z.boolean().optional() }).optional();
    expect(through(Deleted)).toBe(through(inline));
  });

  it('accept the absence of data, and an answer of any extra field', () => {
    expect(Deleted.safeParse(undefined).success).toBe(true);
    expect(Deleted.parse({ deleted: true, more: 1 })).toEqual({ deleted: true, more: 1 });
    expect(Acknowledged.safeParse({ accepted: 'yes' }).success).toBe(false);
  });
});

describe('perishable', () => {
  const Price = z.looseObject({ amount: z.number() });
  const Served = perishable(Price);

  it('adds the validUntil the envelope declares', () => {
    const envelopeField = StudioEnvelopeMetaSchema.shape.validUntil;
    expect(emitted(Served.shape.validUntil)).toBe(emitted(envelopeField));
  });

  it('keeps the fields and the looseness of the schema', () => {
    expect(
      Served.parse({ amount: 1, validUntil: '2026-09-21T20:31:34.118Z', extra: true }),
    ).toEqual({ amount: 1, validUntil: '2026-09-21T20:31:34.118Z', extra: true });
    expect(Served.parse({ amount: 1, validUntil: null })).toEqual({ amount: 1, validUntil: null });
    expect(Served.safeParse({ amount: 1, validUntil: 12 }).success).toBe(false);
  });

  it('types the result', () => {
    expectTypeOf<z.output<typeof Served>['validUntil']>().toEqualTypeOf<
      string | null | undefined
    >();
    expectTypeOf<z.output<typeof Served>['amount']>().toEqualTypeOf<number>();
  });
});

describe('localVocabulary', () => {
  it('emits exactly what the hand-written pair emitted', () => {
    const byHand = vocabularyIn(SECTIONS).meta({
      'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
      'x-arthome-vocabulary-reason': REASON,
    });
    const factory = localVocabulary(SECTIONS, REASON);
    expect(emitted(factory, 'input')).toBe(emitted(byHand, 'input'));
    expect(z.toJSONSchema(factory, { io: 'input' })).toEqual({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'string',
      enum: [...SECTIONS],
      'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
      'x-arthome-vocabulary-reason': REASON,
    });
  });

  it('stays strict on input', () => {
    expect(localVocabulary(SECTIONS, REASON).safeParse('other').success).toBe(false);
  });

  it('refuses a missing reason', () => {
    expect(() => localVocabulary(SECTIONS, '  ')).toThrow(/why/);
  });
});

describe('period', () => {
  const Required = period({ type: 'dateTime' });
  const Optional = period({ type: 'date', required: false });

  it('declares from and to as the routes did inline', () => {
    const [from, to] = Required.parameters;
    expect([from.name, from.in, from.required]).toEqual(['from', 'query', true]);
    expect([to.name, to.in, to.required]).toEqual(['to', 'query', true]);
    expect(emitted(from.schema, 'input')).toBe(emitted(dateTimeIn(), 'input'));
    expect(emitted(to.schema, 'input')).toBe(emitted(dateTimeIn(), 'input'));
    expect(emitted(Optional.parameters[0].schema, 'input')).toBe(emitted(dateIn(), 'input'));
  });

  it('implies the refusal only when the period is required', () => {
    expect(Required.errors).toEqual([ApiErrorCode.PERIOD_FILTER_REQUIRED]);
    expect(Optional.errors).toEqual([]);
    expect(Optional.parameters[0]).not.toHaveProperty('required');
  });

  it('carries a description per bound, and none otherwise', () => {
    const custom = period({
      type: 'date',
      required: false,
      descriptions: { from: 'Required when `period` is `custom`.' },
    });
    expect(custom.parameters[0].description).toBe('Required when `period` is `custom`.');
    expect(custom.parameters[1]).not.toHaveProperty('description');
  });

  it('types the group', () => {
    expectTypeOf(Required.errors).toEqualTypeOf<
      readonly [typeof ApiErrorCode.PERIOD_FILTER_REQUIRED]
    >();
    expectTypeOf(Required.parameters[0].name).toEqualTypeOf<'from'>();
  });
});

describe('searchText', () => {
  it('declares q as the routes did inline', () => {
    const q = searchText();
    expect([q.name, q.in]).toEqual(['q', 'query']);
    expect(q).not.toHaveProperty('description');
    expect(emitted(q.schema, 'input')).toBe(emitted(z.string(), 'input'));
  });

  it('carries a description and a minimum length when given', () => {
    const q = searchText({ description: 'Server-side search.', minLength: 2 });
    expect(q.description).toBe('Server-side search.');
    expect(emitted(q.schema, 'input')).toBe(emitted(z.string().min(2), 'input'));
  });
});
