/**
 * `EnvelopeMeta` — the two instants every response carries, and the one a
 * countdown is computed against.
 *
 * WHY THIS IS THE FIRST SHAPE IN THE PACKAGE. `check-openapi.py` R15 requires
 * every 2xx response in both contracts to compose this object, so it is the one
 * schema that appears in all 174 operations. If the emitted form of anything is
 * going to be wrong, it is cheapest to find out here.
 *
 * `looseObject`, NOT `object`, AND THE ASYMMETRY IS THE POINT.
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
 * `format` IS DECLARED AT THE SOURCE, NOT PATCHED BY THE EMITTER.
 *
 *   `InstantOut` is a regex, so `z.toJSONSchema()` emits `pattern`. Both
 *   contracts carry `format: date-time`, which is what every OpenAPI generator
 *   reads — a pattern tells a generator nothing. `.meta()` supplies it here, at
 *   the declaration, so the emitter stays a serialiser rather than acquiring a
 *   format opinion nothing tests.
 *
 *   Same for `int64` on `lastEventSeq`: `z.int()` emits `minimum`/`maximum` at
 *   ±2^53−1, which is JavaScript's safe range and not the contract's.
 *
 * THE ORDER OF `.nullable()` AND `.meta()` IS LOAD-BEARING, AND IT IS NOT
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
import { ErrorSchema } from '@arthome/core/schema';
/** The meta every STOREFRONT response composes. */
export declare const StorefrontEnvelopeMetaSchema: z.ZodObject<{
    servedAt: z.ZodString;
    validUntil: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    lastEventSeq: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    degraded: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$loose>;
/** The meta every STUDIO response composes. */
export declare const StudioEnvelopeMetaSchema: z.ZodObject<{
    servedAt: z.ZodString;
    validUntil: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    rightsVersion: z.ZodNumber;
    lastEventSeq: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    degraded: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$loose>;
/**
 * `Error` — ONE SHAPE, TWO SETS OF PROSE, and the split is the smallest version
 * of D-065 §G there is.
 *
 * ONLY THE PROSE IS HERE. Shape, regex and vocabulary come from `ErrorSchema`
 *   via `.shape`; `.extend()` replaces a field with itself plus metadata. Delete
 *   every `.describe()` below and both products still emit a correct `Error`.
 *
 * BOTH CONTRACTS PUBLISH THE WHOLE VOCABULARY. The per-document subsets that
 *   were here were the residue of which codes each document happened to mention,
 *   and both carried counts that were wrong within the hour. A client told a code
 *   cannot arrive, wrongly, has no screen for it on the day it does. A narrowing
 *   returns when somebody designs one per product.
 */
export declare const StorefrontErrorSchema: z.ZodObject<typeof ErrorSchema.shape, z.core.$loose>;
export declare const StudioErrorSchema: z.ZodObject<typeof ErrorSchema.shape, z.core.$loose>;
/** `ErrorEnvelope` — the shape every failure arrives in. */
export declare const StorefrontErrorEnvelopeSchema: z.ZodObject<{
    error: typeof StorefrontErrorSchema;
    servedAt: z.ZodString;
}, z.core.$loose>;
export declare const StudioErrorEnvelopeSchema: z.ZodObject<{
    error: typeof StudioErrorSchema;
    servedAt: z.ZodString;
}, z.core.$loose>;
//# sourceMappingURL=index.d.ts.map