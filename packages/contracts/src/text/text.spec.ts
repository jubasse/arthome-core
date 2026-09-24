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

  it('keeps contentLanguage OPEN, because a television must render a language it has never heard of', () => {
    // THIS TEST USED TO ASSERT THE OPPOSITE, AND THE ARGUMENT IT CARRIED IS THE
    // ONE THE MODULE HEADER WARNS ABOUT TWO FILES EARLIER.
    //
    //   It read: "a third PRODUCT language is a catalogue, a build and a store
    //   review — never a value that turns up unannounced in a payload." Every
    //   word of that is true of the viewer's locale and none of it is true of
    //   this field. `contentLanguage` is the language AN AUTHOR TYPED. An artist
    //   can write a hold-screen message in Spanish tomorrow afternoon, with no
    //   catalogue, no build and nobody's permission.
    //
    //   So the test did not merely miss the defect: it stated the case for it,
    //   using the exact conflation the module header opens by naming. A test can
    //   pin a bug as firmly as it pins a guarantee, and this one did it in the
    //   file next door to the warning. D-065 section H.
    const contentLanguage = emit(LocalizedTextSchema).properties.contentLanguage;
    expect(contentLanguage?.enum).toBeUndefined();
    expect(contentLanguage?.type).toBe('string');
    // The members are still PUBLISHED — a client knows what to expect, it is
    // simply not entitled to refuse the rest. That is rule 10 exactly.
    expect(contentLanguage?.['x-arthome-vocabulary']).toEqual(['fr', 'en']);
  });

  it('requires both halves — text without its language is the defect', () => {
    expect(emit(LocalizedTextSchema).required).toEqual(
      expect.arrayContaining(['contentLanguage', 'text']),
    );
  });
});
