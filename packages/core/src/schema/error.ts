/**
 * The single error shape, and the rule that keeps zod's English out of it. Every failure arrives
 * in it, the Traefik gateway included: raw HTML there makes "your connection" indistinguishable
 * from "our servers", and the viewer restarts their set-top box.
 *
 * ⚠ This is `Error`, not `ErrorEnvelope`: a service importing `ErrorEnvelopeSchema` validated
 * the inner object against the outer name and passed. Found only because the empty-diff gate
 * indexes by the DOCUMENT's names — keyed on the code it would have agreed with itself (D-065 §F).
 *
 * ⚠ `ErrorEnvelope` lands with zod's registry mode and not before: without a registry
 * `z.toJSONSchema` inlines its `$ref`, and the document gains a second `Error` under another
 * name while staying VALID (`architecture/handover/backend-contracts.md`).
 */

import { z } from 'zod';

import { vocabularyOut, type VocabularyOut } from './vocabulary.js';
import { FAILURE_NATURES, FailureNature } from '../kernel/errors.js';
import { ERROR_CODES } from '../vocabulary/error-codes.js';

/**
 * The failure nature, tolerant — the only vocabulary in either contract declaring what an unknown
 * member falls back to. Rule 10 leaves "neutral" to the surface; here it cannot, and the cost is
 * asymmetric, since an unknown nature read as `refused` stops a client retrying something that
 * would have worked. `x-arthome-unknown-fallback` appears once in each document, both times here.
 */
export const FailureNatureOut: VocabularyOut = vocabularyOut(FAILURE_NATURES).meta({
  // The named member, never the string: `arthome-check-enums` refuses a copied member here.
  'x-arthome-unknown-fallback': FailureNature.UNAVAILABLE,
});

/**
 * The `Error` shape both contracts publish: `{ code, nature, params, traceId }`.
 *
 * ⚠ `params` carries the message's parameters, never the message: the sentence is composed on
 * the surface, from `code`, in the reader's language.
 *
 * ⚠ The values are `unknown`, not `string`. The studio contract's own published example is
 * `{ missing: ['poster', 'capacity', 'technical_check_passed'] }` — an array, so the stricter
 * schema rejected the example the contract offers (D-065 §D, the code stricter and wrong).
 *
 * `traceId` is copyable from the error screen on purpose: on mobile it is the only link between
 * "my application crashed" and a server log.
 */
export const ErrorSchema: z.ZodObject<
  {
    code: VocabularyOut;
    params: z.ZodObject<Record<string, never>, z.core.$loose>;
    traceId: z.ZodString;
    nature: VocabularyOut;
  },
  z.core.$loose
> = z.looseObject({
  // The vocabulary belongs here, not in the product layer: which codes exist is a fact
  // about the domain, and only the prose around them differs per product. The regex demands
  // a dotted lowercase code — every example in both contracts was SCREAMING_SNAKE until
  // D-067 converted the codes; it now accepts all sixty-four.
  code: vocabularyOut(ERROR_CODES).regex(/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/),
  // `looseObject({})`, not `record()`: both accept any key with any value, but the record
  // form also emits `propertyNames: { type: string }`, which is vacuous and in neither
  // contract.
  params: z.looseObject({}),
  traceId: z.string().min(1),
  nature: FailureNatureOut,
});

/**
 * The only sanctioned way out of a zod failure: a code plus parameters.
 *
 * ⚠ A zod issue's `message` is English prose written by a library. Putting one on a wire
 * makes the contract's language the library's, and no downstream i18n recovers it. The path
 * is joined rather than dropped because "which field" is the one thing a form needs and a
 * code alone cannot carry.
 */
export function issueToCode(issue: z.core.$ZodIssue): {
  readonly code: string;
  readonly params: Readonly<Record<string, string>>;
} {
  const path = issue.path.map((segment) => String(segment)).join('.');
  return {
    code: `validation.${issue.code}`,
    params: path.length > 0 ? { field: path } : {},
  };
}
