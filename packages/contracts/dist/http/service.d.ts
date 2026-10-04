/**
 * The identity of a call between services (`transport.md` §5.2): the internal token the BFF mints,
 * which names the calling service and the end user, verified by the service's guard. A route that
 * requires it is internal, takes the deadline header on every call, and answers
 * `504 api.deadline_exceeded` when the instant is already past.
 */
import { z } from 'zod';
import type { Identity } from './access.js';
import type { HeaderParameter } from './index.js';
export declare const DeadlineParameter: HeaderParameter<'x-arthome-deadline', z.ZodString, true>;
export declare const ServicePrincipalSchema: z.ZodObject<{
    callingService: z.ZodString;
    userId: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const service: Identity<'service', typeof ServicePrincipalSchema, never, readonly [typeof DeadlineParameter], readonly []>;
//# sourceMappingURL=service.d.ts.map