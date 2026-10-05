/** Responses a route states in a few words, so each says the same thing everywhere. */
import { z } from 'zod';
import type { JsonResponse, Response } from './index.js';
export interface AcceptedOptions<S extends z.ZodType | undefined = undefined> {
    /** The operation to follow for the outcome: its id is documented, and the answer carries its `Location`. */
    readonly operation?: string;
    /** What the 202 itself carries, when it is more than an acknowledgement. */
    readonly body?: S;
    readonly description?: string;
}
/**
 * `202`: the work is accepted, not done. It names the operation that reports the outcome, and
 * answers `Retry-After` so a client does not poll blindly.
 */
export declare function accepted<const S extends z.ZodType>(options: AcceptedOptions<S> & {
    readonly body: S;
}): JsonResponse<S>;
export declare function accepted(options?: AcceptedOptions): Response;
//# sourceMappingURL=responses.d.ts.map