import { z } from 'zod';

import { StorefrontEnvelopeMetaSchema } from '../../envelope/index.js';
import { PlanSchema } from '../../ticketing/index.js';

export const PlanListSchema: z.ZodIntersection<
  typeof StorefrontEnvelopeMetaSchema,
  z.ZodObject<{ items: z.ZodArray<typeof PlanSchema> }, z.core.$loose>
> = z.intersection(
  StorefrontEnvelopeMetaSchema,
  z.looseObject({
    items: z.array(PlanSchema),
  }),
);

export type PlanList = z.output<typeof PlanListSchema>;
