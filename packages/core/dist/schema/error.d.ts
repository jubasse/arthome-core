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
import { type VocabularyOut } from './vocabulary.js';
import type { ErrorParamsOf } from '../kernel/error-params.js';
import { type ApiErrorCode } from '../vocabulary/error-codes.js';
/**
 * The failure nature, tolerant — the only vocabulary in either contract declaring its unknown-member
 * fallback, because the cost is asymmetric: an unknown nature read as `refused` stops a client
 * retrying what would have worked. `x-arthome-unknown-fallback` appears once per document, here.
 */
export declare const FailureNatureOut: VocabularyOut;
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
export declare const ErrorSchema: z.ZodObject<{
    code: VocabularyOut;
    params: z.ZodObject<Record<string, never>, z.core.$loose>;
    traceId: z.ZodString;
    nature: VocabularyOut;
}, z.core.$loose>;
/**
 * The only sanctioned way out of a zod failure: `api.schema_invalid`'s params. An issue keeps its
 * path, the rule it broke and that rule's limit, never zod's `message`, which is English prose.
 */
export declare function schemaInvalidParams(issues: readonly z.core.$ZodIssue[]): ErrorParamsOf<typeof ApiErrorCode.SCHEMA_INVALID>;
//# sourceMappingURL=error.d.ts.map