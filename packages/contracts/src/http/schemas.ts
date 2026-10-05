/** Schemas that several routes repeat, written once. */

import { z } from 'zod';

import { VOCABULARY_SOURCE_LOCAL, vocabularyIn, InstantOut } from '@arthome/core/schema';
import type { VocabularyIn } from '@arthome/core/schema';

import { sensitive } from './marks.js';

/** The proof `recentAuth({ intent })` reads: the body of a route that requires it extends this. */
export const ReauthProof: z.ZodObject<{ reauthToken: z.ZodString }, z.core.$strip> = z.object({
  reauthToken: sensitive(z.string()).meta({
    description: 'Single-use re-authentication token, short-lived.',
  }),
});

/** The data of a removal: replayed on something already removed, it still succeeds. */
export const Deleted: z.ZodOptional<
  z.ZodObject<{ deleted: z.ZodOptional<z.ZodBoolean> }, z.core.$loose>
> = z.looseObject({ deleted: z.boolean().optional() }).optional();

/** The data of an action that answers only that it was done. */
export const Acknowledged: z.ZodOptional<
  z.ZodObject<{ accepted: z.ZodOptional<z.ZodBoolean> }, z.core.$loose>
> = z.looseObject({ accepted: z.boolean().optional() }).optional();

type ValidUntil = z.ZodOptional<z.ZodNullable<z.ZodString>>;

/** `schema` with the `validUntil` the envelope declares, for data that stops being true at an instant. */
export function perishable<S extends z.core.$ZodShape, C extends z.core.$ZodObjectConfig>(
  schema: z.ZodObject<S, C>,
): z.ZodObject<S & { validUntil: ValidUntil }, C> {
  return schema.extend({
    validUntil: InstantOut.nullable().meta({ format: 'date-time' }).optional(),
  }) as unknown as z.ZodObject<S & { validUntil: ValidUntil }, C>;
}

/** A request vocabulary no domain owns: `source: none`, and why. */
export function localVocabulary<const T extends readonly [string, ...string[]]>(
  values: T,
  reason: string,
): VocabularyIn<T> {
  if (!reason.trim()) throw new Error('localVocabulary: say why the domain owns nothing here.');
  return vocabularyIn(values).meta({
    'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
    'x-arthome-vocabulary-reason': reason,
  });
}
