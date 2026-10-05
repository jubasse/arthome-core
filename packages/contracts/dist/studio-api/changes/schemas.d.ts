import { z } from 'zod';
import { StudioEnvelopeMetaSchema } from '../../envelope/index.js';
import type { QueryParameter } from '../../http/index.js';
export declare const ChangesSinceParameter: QueryParameter<'since', z.ZodString, true>;
export declare const ChangesChannelParameter: QueryParameter<'channelId', z.ZodString>;
export declare const StudioChangesSchema: z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
    invalidated: z.ZodArray<z.ZodString>;
    complete: z.ZodBoolean;
}, z.core.$loose>>;
export type StudioChanges = z.output<typeof StudioChangesSchema>;
//# sourceMappingURL=schemas.d.ts.map