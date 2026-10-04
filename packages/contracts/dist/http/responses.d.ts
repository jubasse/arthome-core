/** Responses a route states in a few words, so each says the same thing everywhere. */
import { z } from 'zod';
import type { Response } from './index.js';
export interface AcceptedOptions {
    /** The operation to follow for the outcome: its id is documented, and the answer carries its `Location`. */
    readonly operation?: string;
    /** What the 202 itself carries, when it is more than an acknowledgement. */
    readonly body?: z.ZodType;
    readonly description?: string;
}
/**
 * `202`: the work is accepted, not done. It names the operation that reports the outcome, and
 * answers `Retry-After` so a client does not poll blindly.
 */
export declare function accepted(options?: AcceptedOptions): Response;
//# sourceMappingURL=responses.d.ts.map