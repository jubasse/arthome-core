/**
 * `EnvelopeMeta` — the two instants every response carries, and the one a
 * countdown is computed against.
 *
 * WHY THIS IS THE FIRST SHAPE IN THE PACKAGE. `check-openapi.py` R15 requires
 * every 2xx response in both contracts to compose this object, so it is the one
 * schema that appears in all 174 operations. If the emitted form of anything is
 * going to be wrong, it is cheapest to find out here.
 *
 * ⚠ `looseObject`, NOT `object`, AND THE ASYMMETRY IS THE POINT.
 *
 *   `z.object()` emits `additionalProperties: false`. On a RESPONSE that is the
 *   TV-fleet failure one level up from a vocabulary: a client generated from a
 *   closed schema REJECTS a server that added a field, and neither contract says
 *   `additionalProperties` anywhere. Critical rule 10 puts it for members —
 *   strictness applies to the shape, never to the member — and the missing half
 *   is that **strictness belongs to the shape's REQUIRED FIELDS, never to its
 *   extensibility**.
 *
 *   So: `looseObject` for anything a server sends, `object` for anything a
 *   client sends. Tolerance on a read degrades a card; tolerance on a write
 *   corrupts a record (`schema/vocabulary.ts` states the same asymmetry for
 *   members).
 *
 * ⚠ `format` IS DECLARED AT THE SOURCE, NOT PATCHED BY THE EMITTER.
 *
 *   `InstantSchema` is a regex, so `z.toJSONSchema()` emits `pattern`. Both
 *   contracts carry `format: date-time`, which is what every OpenAPI generator
 *   reads — a pattern tells a generator nothing. `.meta()` supplies it here, at
 *   the declaration, so the emitter stays a serialiser rather than acquiring a
 *   format opinion nothing tests.
 *
 *   Same for `int64` on `lastEventSeq`: `z.int()` emits `minimum`/`maximum` at
 *   ±2^53−1, which is JavaScript's safe range and not the contract's.
 *
 * ⚠ THE ORDER OF `.nullable()` AND `.meta()` IS LOAD-BEARING, AND IT IS NOT
 *   OBVIOUS.
 *
 *     .meta({format}).nullable()  ->  anyOf: [{…, format}, {type: null}]
 *     .nullable().meta({format})  ->  { anyOf: [{…}, {type: null}], format }
 *
 *   The contracts carry the format on the FIELD, not inside one branch of a
 *   union, so the second spelling is the one that matches. Written down because
 *   the two read identically and emit differently — the difference is visible
 *   only in the output, which is the shape of defect this repository has spent a
 *   week on.
 */

import { z } from 'zod';

import { InstantSchema } from '@arthome/core/schema';

/** An instant as the contracts document it: ISO 8601 UTC, `format: date-time`. */
export const WireInstantSchema: z.ZodString = InstantSchema.meta({
  format: 'date-time',
  examples: ['2026-09-21T20:31:04.118Z'],
});

/**
 * The meta every response composes.
 *
 * `servedAt` is mandatory and `validUntil` is not: a response with no perishable
 * value has nothing to expire, and serving a null there would invite a surface
 * to count down to it.
 */
export const EnvelopeMetaSchema: z.ZodObject<{
  servedAt: z.ZodString;
  validUntil: z.ZodNullable<z.ZodString>;
  lastEventSeq: z.ZodNullable<z.ZodInt>;
}> = z.looseObject({
  servedAt: WireInstantSchema.describe(
    'Server instant. **Every** displayed countdown is computed against it, never against the ' +
      "client's clock.",
  ),
  validUntil: InstantSchema.nullable()
    .meta({ format: 'date-time', examples: ['2026-09-21T20:31:34.118Z'] })
    .describe(
      'Present as soon as a perishable value is in the response. Past that instant, the surface ' +
        '**calls the same `@arthome/core` function again** with the inputs it already has — it does ' +
        'not rewrite the rule, it re-runs it.',
    ),
  lastEventSeq: z
    .int()
    .nullable()
    .meta({ format: 'int64' })
    .describe('Sequence number of the last event applied to the read model. Resume point.'),
});
