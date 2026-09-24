/**
 * The single error envelope, and the rule that keeps zod's English out of it.
 *
 * Every failure on every surface arrives in this shape — up to and including
 * the Traefik gateway, because a gateway returning a raw HTML page makes it
 * impossible to tell "your connection" from "our servers", and the viewer goes
 * and restarts their set-top box.
 */
import { z } from 'zod';
import { type VocabularyOut } from './vocabulary.js';
export declare const FailureNatureOut: VocabularyOut;
/**
 * ⚠ `params` carries the MESSAGE'S PARAMETERS, never the message. The sentence
 * is composed on the surface, in the reader's language, from `code`. A server
 * that sends prose has decided the reader's language for them — and it is the
 * payment form that leaks first.
 *
 * `traceId` is readable and copyable from the error screen on purpose: on
 * mobile it is the only link between "my application crashed" and a server log.
 */
export declare const ErrorEnvelopeSchema: z.ZodObject<{
    code: z.ZodString;
    params: z.ZodRecord<z.ZodString, z.ZodString>;
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