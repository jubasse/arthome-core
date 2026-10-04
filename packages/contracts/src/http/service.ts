/**
 * The identity of a call between services (`transport.md` §5.2): the internal token the BFF mints,
 * which names the calling service and the end user, verified by the service's guard. A route that
 * requires it is internal, takes the deadline header on every call, and answers
 * `504 api.deadline_exceeded` when the instant is already past.
 */

import { z } from 'zod';

import { identity } from './access.js';
import type { Identity } from './access.js';
import type { HeaderParameter } from './index.js';

export const DeadlineParameter: HeaderParameter<'x-arthome-deadline', z.ZodString, true> = {
  name: 'x-arthome-deadline',
  in: 'header',
  required: true,
  description:
    'The RFC 3339 UTC instant after which the caller no longer waits. A service handed a past instant does nothing.',
  schema: z.string().meta({ format: 'date-time' }),
};

export const ServicePrincipalSchema: z.ZodObject<
  { callingService: z.ZodString; userId: z.ZodNullable<z.ZodString> },
  z.core.$strip
> = z.object({ callingService: z.string(), userId: z.string().nullable() });

export const service: Identity<
  'service',
  typeof ServicePrincipalSchema,
  never,
  readonly [typeof DeadlineParameter],
  readonly []
> = identity('service', {
  schemes: { read: [{ internalToken: [] }], write: [{ internalToken: [] }] },
  principal: ServicePrincipalSchema,
  parameters: [DeadlineParameter],
  internal: true,
});
