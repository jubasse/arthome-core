/**
 * The single error shape. Every failure arrives in it, the Traefik gateway included: raw HTML there
 * makes "your connection" indistinguishable from "our servers".
 *
 * This is `Error`, not `ErrorEnvelope`: a service importing `ErrorEnvelopeSchema` validated the
 * inner object against the outer name and passed. Found only because the empty-diff gate indexes by
 * the DOCUMENT's names — keyed on the code it would have agreed with itself (D-065 §F).
 *
 * `ErrorEnvelope` waits for zod's registry mode: without a registry `z.toJSONSchema` inlines its
 * `$ref` and the document gains a second `Error` under another name, while staying VALID.
 */

import { z } from 'zod';

import { vocabularyOut, type VocabularyOut } from './vocabulary.js';
import { FAILURE_NATURES, FailureNature } from '../kernel/errors.js';
import { ERROR_CODES } from '../vocabulary/error-codes.js';

/**
 * The failure nature, tolerant — the only vocabulary in either contract declaring its unknown-member
 * fallback, because the cost is asymmetric: an unknown nature read as `refused` stops a client
 * retrying what would have worked. `x-arthome-unknown-fallback` appears once per document, here.
 */
export const FailureNatureOut: VocabularyOut = vocabularyOut(FAILURE_NATURES).meta({
  // The named member, never the string: `arthome-check-enums` refuses a copied member here.
  'x-arthome-unknown-fallback': FailureNature.UNAVAILABLE,
});

/**
 * The `Error` shape both contracts publish: `{ code, nature, params, traceId }`. `traceId` is
 * copyable off the error screen on purpose — on mobile it is the only link between "my application
 * crashed" and a server log.
 *
 * `params` carries the message's parameters, never the message: the sentence is composed on the
 * surface, from `code`, in the reader's language.
 *
 * Its values are `unknown`, not `string`: the studio contract's own example is
 * `{ missing: ['poster', …] }`, an array, so the stricter schema rejected the example the contract
 * offers (D-065 §D, the code stricter and wrong).
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
  // Which codes exist is a fact about the domain; only the prose around them differs per product.
  // Every example in both contracts was SCREAMING_SNAKE until D-067 converted them to the dotted
  // lowercase this regex demands; it now accepts all sixty-four.
  code: vocabularyOut(ERROR_CODES).regex(/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/),
  // Not `record()`: it also emits `propertyNames: { type: string }`, vacuous and in neither
  // contract.
  params: z.looseObject({}),
  traceId: z.string().min(1),
  nature: FailureNatureOut,
});

/**
 * The only sanctioned way out of a zod failure. Its `message` is prose written by a library, and
 * putting one on a wire makes the contract's language the library's. The path is joined rather than
 * dropped because "which field" is what a form needs and a code alone cannot carry.
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
