import { z } from 'zod';
/** A profile's point on one date: where it stopped, when it was written, whether it finished. */
export declare const ViewerProgressSchema: z.ZodObject<{
    positionSec: z.ZodNonOptional<z.ZodOptional<z.ZodInt>>;
    version: z.ZodNonOptional<z.ZodOptional<z.ZodInt>>;
    writtenAt: z.ZodString;
    completed: z.ZodBoolean;
}, z.core.$loose>;
/** `transport.md` §5.6: the profile beside the date ids, never one id at a time. */
export declare const ViewerProgressBatchBodySchema: z.ZodObject<{
    profileId: z.ZodString;
    dateIds: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type ViewerProgress = z.output<typeof ViewerProgressSchema>;
export type ViewerProgressBatchBody = z.output<typeof ViewerProgressBatchBodySchema>;
//# sourceMappingURL=schemas.d.ts.map