import { z } from 'zod';

import { uuidOut } from '@arthome/core/schema';

import { StudioEnvelopeMetaSchema } from '../../envelope/index.js';
import { StudioCountersSchema } from '../../studio-access/index.js';

export const MarkInboxReadBodySchema: z.ZodObject<
  {
    entryIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    all: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
  },
  z.core.$strip
> = z.object({
  entryIds: z.array(uuidOut()).optional(),
  all: z.boolean().default(false).optional(),
});

export const InboxReadAnswerSchema: z.ZodIntersection<
  typeof StudioEnvelopeMetaSchema,
  z.ZodObject<{ data: typeof StudioCountersSchema }, z.core.$loose>
> = z.intersection(StudioEnvelopeMetaSchema, z.looseObject({ data: StudioCountersSchema }));

export type MarkInboxReadBody = z.output<typeof MarkInboxReadBodySchema>;
export type InboxReadAnswer = z.output<typeof InboxReadAnswerSchema>;
