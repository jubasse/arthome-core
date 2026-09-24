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
 *   `InstantOut` is a regex, so `z.toJSONSchema()` emits `pattern`. Both
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

import {
  DomainErrorCode,
  FailureNature,
  PublicationChecklistItem,
  PublicationState,
} from '@arthome/core';
import { ErrorSchema, InstantOut, int64 } from '@arthome/core/schema';

/** The meta every STOREFRONT response composes. */
export const StorefrontEnvelopeMetaSchema: z.ZodObject<
  {
    servedAt: z.ZodString;
    validUntil: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    lastEventSeq: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    degraded: z.ZodOptional<z.ZodArray<z.ZodString>>;
  },
  z.core.$loose
> = z.looseObject({
  servedAt: InstantOut.meta({
    format: 'date-time',
    examples: ['2026-09-21T20:31:04.118Z'],
  }).describe(
    "Server instant. **Every** displayed countdown is computed against it, never against the\nclient's clock.\n",
  ),
  validUntil: InstantOut.nullable()
    .meta({ format: 'date-time', examples: ['2026-09-21T20:31:34.118Z'] })
    .optional()
    .describe(
      'Present as soon as a perishable value is in the response. Past that instant, the surface\n**calls the same `@arthome/core` function again** with the inputs it already has — it does\nnot rewrite the rule, it re-runs it.\n',
    ),
  lastEventSeq: int64()
    .nullable()
    .optional()

    .describe('Sequence number of the last event applied to the read model. Resume point.'),
  degraded: z
    .array(z.string())
    .optional()
    .meta({ examples: [['viewerProgress']] })
    .describe(
      'The **optional** parts that could not be composed. The response is served anyway: a\nper-viewer overlay that fails degrades the card, it does not sink the screen.\n',
    ),
});

/**
 * The meta every STUDIO response composes. It differs from the storefront's:
 * `rightsVersion` is mandatory here (a changed value means the navigation is stale)
 * and the prose is the console's, not the viewer's — D-065 family G.
 */
export const StudioEnvelopeMetaSchema: z.ZodObject<
  {
    servedAt: z.ZodString;
    validUntil: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    rightsVersion: z.ZodNumber;
    lastEventSeq: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    degraded: z.ZodOptional<z.ZodArray<z.ZodString>>;
  },
  z.core.$loose
> = z.looseObject({
  servedAt: InstantOut.meta({
    format: 'date-time',
    examples: ['2026-09-21T20:31:04.118Z'],
  }).describe(
    'The reference clock. The duty countdown, the length of a silencing, "the replay expires in\n41 h", the expiry of a one-off access: everything is counted against it and a measured offset,\n**never against the workstation\'s clock**.\n',
  ),
  validUntil: InstantOut.nullable().meta({ format: 'date-time' }).optional(),
  rightsVersion: int64()
    .meta({ examples: [412] })
    .describe('**On every response.** When it changes, the navigation is stale.'),
  lastEventSeq: int64().nullable().optional(),
  degraded: z
    .array(z.string())
    .optional()
    .describe('The optional parts that could not be composed. The console paints anyway.'),
});

/**
 * `Error` — ONE SHAPE, TWO SETS OF PROSE, and the split is the smallest version
 * of D-065 §G there is.
 *
 * The two contracts declare byte-identical PROPERTIES and different
 * DESCRIPTIONS. That is legitimate: `code`'s example is
 * `publication.transition_irreversible` for a viewer and
 * `publication.checklist_incomplete` for a control room, because those are the
 * refusals each one actually meets. An example from the wrong product is worse
 * than none — it teaches a reader a code their surface will never see.
 *
 * ⚠ SO ONLY THE PROSE IS HERE. The shape, the regex and the sixty-four-member
 *   vocabulary all come from `ErrorSchema` in `@arthome/core/schema`, reached
 *   through `.shape`, and `.extend()` REPLACES a field with the same field plus
 *   metadata. Nothing is redeclared: delete the `.describe()` calls below and
 *   both products still emit a correct `Error`.
 *
 * ⚠ AND THE NARROWING THAT WAS HERE AN HOUR AGO IS GONE, WHICH IS THE PART
 *   WORTH READING.
 *
 *   Each document briefly declared its own subset — 24 codes for the storefront,
 *   33 for the studio — with prose explaining why a viewer cannot close a
 *   reconciliation period. The families made that argument well and the list did
 *   not: it was built from WHICH CODES EACH DOCUMENT HAPPENED TO MENTION, so the
 *   studio got `api.rate_limited` and the storefront did not, for no reason
 *   anybody could state. A rate limit is not a studio notion.
 *
 *   *A narrowing that is a snapshot of examples is a claim with nobody behind
 *   it* — and it had already rotted: both narrowing texts carried a count, and
 *   both counts were wrong within the hour, in opposite directions.
 *
 *   So both contracts publish the whole vocabulary. A client that never receives
 *   a code simply never renders it; a client told a code cannot arrive, wrongly,
 *   has no screen for it on the day it does. The narrowing comes back when
 *   somebody DESIGNS one, per product, with an argument — not as the residue of
 *   an extraction.
 */

export const StorefrontErrorSchema: z.ZodObject<typeof ErrorSchema.shape, z.core.$loose> =
  ErrorSchema.extend({
    code: ErrorSchema.shape.code
      .meta({ examples: [DomainErrorCode.PUBLICATION_TRANSITION_IRREVERSIBLE] })
      .describe(
        'Closed vocabulary, i18n by codes. **Never a sentence.** A code unknown to one version of the\napplication falls back on the snapshot embedded at build time — that is an operating\ncondition on mobile, where store review is slow.\n',
      ),
    nature: ErrorSchema.shape.nature
      .meta({ examples: [FailureNature.REFUSED] })
      .describe(
        'The decision the person has to make. `refused`: do not retry, understand. `unavailable`:\nretry. `offline_forbidden`: a **local** refusal, before anything is sent — **never emitted by\nthe server**, present in the vocabulary so the surface has only one error shape to render.\n\n**Open vocabulary on read, and this is where it matters most.** An unknown nature —\n`degraded`, `needs_reauth` — is treated as **`unavailable`**, hence retryable. A frozen\n`enum` here would make a television on an earlier version reject the whole envelope: it would\nnot lose a card, it would lose its ability to **read errors**, precisely when something is\nalready wrong, and on a fleet we cannot update.\n',
      ),
    params: ErrorSchema.shape.params
      .meta({
        examples: [
          {
            from: PublicationState.SCHEDULED,
            to: PublicationState.RESERVE,
            promise: 'prices_engaged',
          },
        ],
      })
      .describe("The message's parameters, never the message."),
    traceId: ErrorSchema.shape.traceId
      .meta({ examples: ['4bf92f3577b34da6a3ce929d0e0e4736'] })
      .describe(
        'The `trace-id` part of the `traceparent`. Readable and copyable from the error screen: on\nmobile it is the only link between "my application crashed" and a server log.\n',
      ),
  });

export const StudioErrorSchema: z.ZodObject<typeof ErrorSchema.shape, z.core.$loose> =
  ErrorSchema.extend({
    code: ErrorSchema.shape.code
      .meta({ examples: [DomainErrorCode.PUBLICATION_CHECKLIST_INCOMPLETE] })
      .describe(
        'Closed vocabulary, i18n by codes, **with a snapshot embedded at build time as a mandatory\nfallback**. That is vital here: **a store review is slow**. If a new code arrives from the\nbackend before the application is updated, the person on duty must see a sentence, not\n`moderation.verdict.conflict`.\n',
      ),
    nature: ErrorSchema.shape.nature.describe(
      '`offline_forbidden` is a **local** refusal, never emitted by the server.\n\n**Open vocabulary on read.** An unknown nature is treated as **`unavailable`**, hence\nretryable. A frozen `enum` here would make an earlier version of the application reject the\n**whole** error envelope — that is, lose the ability to read errors at the precise moment\nsomething is wrong, on duty, on an application a store review takes days to replace.\n',
    ),
    params: ErrorSchema.shape.params.meta({
      examples: [
        {
          missing: [
            PublicationChecklistItem.POSTER,
            PublicationChecklistItem.CAPACITY,
            PublicationChecklistItem.TECHNICAL_CHECK_PASSED,
          ],
        },
      ],
    }),
    traceId: ErrorSchema.shape.traceId
      .meta({ examples: ['4bf92f3577b34da6a3ce929d0e0e4736'] })
      .describe(
        'The one moment left where the person can read out a number and dictate it to support.',
      ),
  });

/**
 * `ErrorEnvelope` — the shape every failure arrives in, and the one schema that
 * waited for the emitter rather than for a decision.
 *
 * It was deliberately left unwritten until `$ref` emission existed. Without a
 * registry, `z.toJSONSchema` INLINES every nested object, so an envelope written
 * earlier would have emitted a copy of `Error` inside itself and the document
 * would have gained a second `Error` under no name at all — E2, produced by the
 * tool built to remove it. Registry mode landed with one registry per document,
 * and `error` now emits as `$ref`.
 *
 * Two of them, because `Error` itself carries per-product prose: a viewer's
 * example code is `publication.transition_irreversible`, a control room's is
 * `publication.checklist_incomplete`. The ENVELOPE is identical in both
 * contracts; only what it wraps differs.
 */
export const StorefrontErrorEnvelopeSchema: z.ZodObject<
  { error: typeof StorefrontErrorSchema; servedAt: z.ZodString },
  z.core.$loose
> = z.looseObject({
  error: StorefrontErrorSchema,
  servedAt: InstantOut.meta({ format: 'date-time', pattern: undefined }),
});

export const StudioErrorEnvelopeSchema: z.ZodObject<
  { error: typeof StudioErrorSchema; servedAt: z.ZodString },
  z.core.$loose
> = z.looseObject({
  error: StudioErrorSchema,
  servedAt: InstantOut.meta({ format: 'date-time', pattern: undefined }),
});
