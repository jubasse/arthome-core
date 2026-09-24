/**
 * What these tests pin is the EMITTED SHAPE, not the validation.
 *
 * zod validates correctly in every case below — that is never in doubt and is
 * not worth a test. What is worth pinning is that the emitted JSON Schema says
 * what `openapi/*.yaml` says, because the failure mode found this week is a
 * schema that works while the document it generates is wrong: `.nullable()`
 * buries `x-arthome-vocabulary` inside `anyOf[0]`, everything still parses, and
 * only the contract is false.
 *
 * These are the assertions `contracts:emit` will make against the whole
 * document. Making them here, per shape, is what stops the first full emit from
 * being a thousand-line diff with the interesting lines buried in it.
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { CursorPageInfoSchema, EMPTY_REASONS, OffsetPageInfoSchema } from './index.js';

const emit = (schema: z.ZodType): Record<string, unknown> =>
  z.toJSONSchema(schema, { io: 'output' });

describe('CursorPageInfo', () => {
  it('is open, because a client must not reject a server that added a field', () => {
    const out = emit(CursorPageInfoSchema);
    expect(out.additionalProperties).not.toBe(false);
  });

  it('carries the vocabulary ON THE FIELD, not inside an anyOf branch', () => {
    const props = emit(CursorPageInfoSchema).properties as Record<string, Record<string, unknown>>;
    const emptyReason = props.emptyReason!;

    // The whole point: `vocabularyOut(V).nullable()` would put the key inside
    // anyOf[0] and this assertion is what catches that.
    expect(emptyReason['x-arthome-vocabulary']).toEqual([...EMPTY_REASONS]);
    expect(emptyReason.anyOf).toBeUndefined();
    expect(emptyReason.type).toEqual(['string', 'null']);
  });

  it('keeps the description beside the vocabulary rather than replacing it', () => {
    const props = emit(CursorPageInfoSchema).properties as Record<string, Record<string, unknown>>;
    const emptyReason = props.emptyReason!;
    expect(typeof emptyReason.description).toBe('string');
    expect(emptyReason['x-arthome-vocabulary']).toBeDefined();
  });

  it('declares int64 on the field, not JavaScript safe-integer bounds', () => {
    const props = emit(CursorPageInfoSchema).properties as Record<string, Record<string, unknown>>;
    expect(props.approximateTotal!.format).toBe('int64');
  });
});

describe('OffsetPageInfo', () => {
  it('is open like its cursor counterpart', () => {
    expect(emit(OffsetPageInfoSchema).additionalProperties).not.toBe(false);
  });

  it('requires all four counters — a page number with no total paginates to nothing', () => {
    expect(emit(OffsetPageInfoSchema).required).toEqual(
      expect.arrayContaining(['page', 'pageSize', 'totalItems', 'totalPages']),
    );
  });
});
