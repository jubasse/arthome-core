import { z } from 'zod';
import { StorefrontEnvelopeMetaSchema } from '../../envelope/index.js';
import { PlanSchema } from '../../ticketing/index.js';
export declare const PlanListSchema: z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
    items: z.ZodArray<typeof PlanSchema>;
}, z.core.$loose>>;
export type PlanList = z.output<typeof PlanListSchema>;
//# sourceMappingURL=schemas.d.ts.map