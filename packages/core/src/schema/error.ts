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
import type { ErrorParamsOf, SchemaIssue } from '../kernel/error-params.js';
import { FAILURE_NATURES, FailureNature } from '../kernel/errors.js';
import { ERROR_CODES, SchemaIssueRule, type ApiErrorCode } from '../vocabulary/error-codes.js';

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
 * The only sanctioned way out of a zod failure: `api.schema_invalid`'s params. An issue keeps its
 * path, the rule it broke and that rule's limit, never zod's `message`, which is English prose.
 */
export function schemaInvalidParams(
  issues: readonly z.core.$ZodIssue[],
): ErrorParamsOf<typeof ApiErrorCode.SCHEMA_INVALID> {
  return { issues: issues.flatMap(schemaIssuesOf) };
}

function schemaIssuesOf(issue: z.core.$ZodIssue): SchemaIssue[] {
  const path = issue.path.map((segment) =>
    typeof segment === 'number' ? segment : String(segment),
  );
  // Five rules are named as zod names its codes; the other codes are zod's alone.
  switch (issue.code) {
    case SchemaIssueRule.TOO_SMALL:
      return [
        {
          path,
          rule: SchemaIssueRule.TOO_SMALL,
          minimum: Number(issue.minimum),
          inclusive: issue.inclusive ?? true,
        },
      ];
    case SchemaIssueRule.TOO_BIG:
      return [
        {
          path,
          rule: SchemaIssueRule.TOO_BIG,
          maximum: Number(issue.maximum),
          inclusive: issue.inclusive ?? true,
        },
      ];
    case SchemaIssueRule.INVALID_TYPE:
      return [{ path, rule: SchemaIssueRule.INVALID_TYPE }];
    case SchemaIssueRule.INVALID_FORMAT:
      return [{ path, rule: SchemaIssueRule.INVALID_FORMAT, format: issue.format }];
    case SchemaIssueRule.INVALID_VALUE:
      return [
        { path, rule: SchemaIssueRule.INVALID_VALUE, values: issue.values.flatMap(wireValue) },
      ];
    case 'unrecognized_keys':
      return issue.keys.map((key) => ({
        path: [...path, key],
        rule: SchemaIssueRule.UNRECOGNIZED_KEY,
      }));
    case 'invalid_union':
      // A discriminated union names the tags it knows; a plain one, no branch that fit.
      return 'options' in issue && issue.options !== undefined
        ? [{ path, rule: SchemaIssueRule.INVALID_VALUE, values: issue.options.flatMap(wireValue) }]
        : [{ path, rule: SchemaIssueRule.INVALID_TYPE }];
    case 'not_multiple_of':
    case 'invalid_key':
    case 'invalid_element':
      return [{ path, rule: SchemaIssueRule.INVALID_VALUE }];
    case SchemaIssueRule.CUSTOM:
      return [{ path, rule: SchemaIssueRule.CUSTOM }];
  }
}

function wireValue(value: unknown): (string | number | boolean | null)[] {
  if (typeof value === 'bigint') return [Number(value)];
  if (value === null || typeof value === 'string' || typeof value === 'number') return [value];
  return typeof value === 'boolean' ? [value] : [];
}
