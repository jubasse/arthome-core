import { z } from 'zod';
import { StudioEnvelopeMetaSchema } from '../../envelope/index.js';
import { StudioCountersSchema } from '../../studio-access/index.js';
export declare const MarkInboxReadBodySchema: z.ZodObject<{
    entryIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    all: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const InboxReadAnswerSchema: z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
    data: typeof StudioCountersSchema;
}, z.core.$loose>>;
export type MarkInboxReadBody = z.output<typeof MarkInboxReadBodySchema>;
export type InboxReadAnswer = z.output<typeof InboxReadAnswerSchema>;
//# sourceMappingURL=schemas.d.ts.map