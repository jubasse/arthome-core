import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { StorefrontLocalizedTextSchema } from './index.js';

interface EmittedObject {
  readonly additionalProperties?: unknown;
  readonly properties: Record<string, Record<string, unknown>>;
  readonly required?: readonly string[];
}

const emit = (schema: z.ZodType): EmittedObject =>
  z.toJSONSchema(schema, { io: 'output' }) as unknown as EmittedObject;

describe('LocalizedText', () => {
  it('is open, like every other shape a server sends', () => {
    expect(emit(StorefrontLocalizedTextSchema).additionalProperties).not.toBe(false);
  });

  it('keeps contentLanguage OPEN, because a television must render a language it has never heard of', () => {
    // THIS TEST USED TO ASSERT THE OPPOSITE, arguing the viewer-locale case for a
    //   field that carries the language AN AUTHOR TYPED. It did not miss the defect,
    //   it stated the case for it: a test pins a bug as firmly as a guarantee.
    //   D-065 §H.
    const contentLanguage = emit(StorefrontLocalizedTextSchema).properties.contentLanguage;
    expect(contentLanguage?.enum).toBeUndefined();
    expect(contentLanguage?.type).toBe('string');
    // Both documents publish `contentLanguage` as a bare string with an example and
    // no vocabulary block (D-065 family G: the document wins), so none is emitted.
    expect(contentLanguage?.['x-arthome-vocabulary']).toBeUndefined();
  });

  it('requires both halves — text without its language is the defect', () => {
    expect(emit(StorefrontLocalizedTextSchema).required).toEqual(
      expect.arrayContaining(['contentLanguage', 'text']),
    );
  });
});
