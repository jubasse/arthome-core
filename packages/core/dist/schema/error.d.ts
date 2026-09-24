/**
 * The single error shape, and the rule that keeps zod's English out of it.
 *
 * Every failure on every surface arrives in this shape — up to and including
 * the Traefik gateway, because a gateway returning a raw HTML page makes it
 * impossible to tell "your connection" from "our servers", and the viewer goes
 * and restarts their set-top box.
 *
 * ⚠ THIS IS `Error`, NOT `ErrorEnvelope`, AND IT SPENT ITS WHOLE LIFE UNDER THE
 *   WRONG NAME.
 *
 *   Both contracts define two schemas: `Error` is `{ code, nature, params,
 *   traceId }` and `ErrorEnvelope` is `{ error: $ref Error, servedAt }`. This
 *   module exported the first under the second's name. A service importing
 *   `ErrorEnvelopeSchema` to validate an error RESPONSE would have validated the
 *   inner object against the outer name — **and passed**, because the payload it
 *   was handed is a superset of nothing it checks.
 *
 *   Found by the empty-diff gate, and only because that gate indexes BY THE
 *   DOCUMENT'S NAMES rather than by the code's: a comparison keyed on the code
 *   would have compared this schema to itself and agreed. D-065 §F.
 *
 * ⚠ THE ENVELOPE IS NOT HERE YET, AND ITS ABSENCE IS DELIBERATE RATHER THAN
 *   PENDING.
 *
 *   `ErrorEnvelope` carries `error` as a `$ref`. Emitting a `$ref` needs zod's
 *   REGISTRY mode with a `uri` callback; without it `z.toJSONSchema` **inlines
 *   every nested object**, so an envelope written today would emit a copy of
 *   this schema inside itself and the document would gain a second `Error` under
 *   another name — E2, produced by the tool meant to eliminate it.
 *
 *   So it lands with registry mode and not before. The trap to know when it
 *   does: the id lives on the schema, so a schema nobody registered is silently
 *   inlined and the emitted document stays VALID —
 *   `architecture/handover/backend-contracts.md` has the exact call.
 */
import { z } from 'zod';
import { type VocabularyOut } from './vocabulary.js';
/**
 * The failure nature, tolerant — and the ONLY vocabulary in either contract that
 * declares what an unknown member falls back to.
 *
 * Rule 10 says an unknown member is kept raw and treated as neutral. For every
 * other vocabulary the surface decides what neutral means; here it cannot, and
 * getting it wrong is expensive in one direction: an unknown nature read as
 * `refused` **stops a client retrying something that would have worked**. So the
 * fallback is SERVED — `unavailable`, hence retryable — and a television on a
 * year-old build handles a nature invented since without being told about it.
 *
 * Counted before generalising: `x-arthome-unknown-fallback` appears exactly once
 * in each document, both times here. It is this field's annotation, not a
 * parameter `vocabularyOut` should grow.
 */
export declare const FailureNatureOut: VocabularyOut;
/**
 * ⚠ `params` carries the MESSAGE'S PARAMETERS, never the message. The sentence
 * is composed on the surface, in the reader's language, from `code`. A server
 * that sends prose has decided the reader's language for them — and it is the
 * payment form that leaks first.
 *
 *   ⚠ THE VALUES ARE `unknown`, AND THIS WAS `string` UNTIL THE DOCUMENT
 *     REFUTED IT. `Record<string, string>` reads as the tidy choice — every
 *     param renders into a sentence, so make them all renderable. The studio
 *     contract publishes this example of its own `params`:
 *
 *       { missing: ['poster', 'capacity', 'technical_check_passed'] }
 *
 *     An ARRAY. The stricter schema would have rejected the very example the
 *     contract offers, and a checklist refusal is the studio's most common
 *     error. *The discriminating case did not have to be constructed: the
 *     document was carrying it.* (D-065 §D, in the direction nobody expected —
 *     the code was stricter and the code was wrong.)
 *
 * `traceId` is readable and copyable from the error screen on purpose: on
 * mobile it is the only link between "my application crashed" and a server log.
 */
export declare const ErrorSchema: z.ZodObject<{
    code: z.ZodString;
    params: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    traceId: z.ZodString;
    nature: VocabularyOut;
}, z.core.$loose>;
/**
 * The ONLY sanctioned way out of a zod failure.
 *
 * ⚠ A zod issue's `message` is English prose written by a library. Putting one
 * on a wire makes the contract's language the library's, and no amount of i18n
 * downstream recovers it — the surface receives a sentence it cannot translate
 * and cannot shorten. So an issue becomes a CODE plus PARAMETERS, and the
 * sentence is the surface's to compose.
 *
 * The path is joined rather than dropped because "which field" is the one thing
 * a form needs and a code alone cannot carry.
 */
export declare function issueToCode(issue: z.core.$ZodIssue): {
    readonly code: string;
    readonly params: Readonly<Record<string, string>>;
};
//# sourceMappingURL=error.d.ts.map