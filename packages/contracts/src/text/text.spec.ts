import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { LocalizedTextSchema } from './index.js';

interface EmittedObject {
  readonly additionalProperties?: unknown;
  readonly properties: Record<string, Record<string, unknown>>;
  readonly required?: readonly string[];
}

const emit = (schema: z.ZodType): EmittedObject =>
  z.toJSONSchema(schema, { io: 'output' }) as unknown as EmittedObject;

describe('LocalizedText', () => {
  it('is open, like every other shape a server sends', () => {
    expect(emit(LocalizedTextSchema).additionalProperties).not.toBe(false);
  });

  it('constrains contentLanguage to the two the product has', () => {
    // STRICT here and not tolerant, deliberately: this is not an open vocabulary
    // that may gain a member while a television is in the field. A third product
    // language is a catalogue, a build and a store review — never a value that
    // turns up unannounced in a payload.
    expect(emit(LocalizedTextSchema).properties.contentLanguage?.enum).toEqual(['fr', 'en']);
  });

  it('requires both halves — text without its language is the defect', () => {
    expect(emit(LocalizedTextSchema).required).toEqual(
      expect.arrayContaining(['contentLanguage', 'text']),
    );
  });
});
