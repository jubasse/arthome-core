/**
 * The single error envelope, and the rule that keeps zod's English out of it.
 *
 * Every failure on every surface arrives in this shape — up to and including
 * the Traefik gateway, because a gateway returning a raw HTML page makes it
 * impossible to tell "your connection" from "our servers", and the viewer goes
 * and restarts their set-top box.
 */
import { z } from 'zod';
import { vocabularyOut } from './vocabulary.js';
import { FAILURE_NATURES } from '../kernel/errors.js';
export const FailureNatureOut = vocabularyOut(FAILURE_NATURES);
/**
 * ⚠ `params` carries the MESSAGE'S PARAMETERS, never the message. The sentence
 * is composed on the surface, in the reader's language, from `code`. A server
 * that sends prose has decided the reader's language for them — and it is the
 * payment form that leaks first.
 *
 * `traceId` is readable and copyable from the error screen on purpose: on
 * mobile it is the only link between "my application crashed" and a server log.
 */
export const ErrorEnvelopeSchema = z.object({
    code: z.string().regex(/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/),
    params: z.record(z.string(), z.string()),
    traceId: z.string().min(1),
    nature: FailureNatureOut,
});
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
export function issueToCode(issue) {
    const path = issue.path.map((segment) => String(segment)).join('.');
    return {
        code: `validation.${issue.code}`,
        params: path.length > 0 ? { field: path } : {},
    };
}
//# sourceMappingURL=error.js.map