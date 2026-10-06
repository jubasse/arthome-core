import { z } from 'zod';

import { InstantOut, uuidIn } from '@arthome/core/schema';

import { BATCH_MAX_IDS } from '../../http/index.js';
import { PlaybackPositionSchema } from '../../storefront-api/me/schemas.js';

/** A profile's point on one date: where it stopped, when it was written, whether it finished. */
export const ViewerProgressSchema: z.ZodObject<
  {
    positionSec: z.ZodNonOptional<z.ZodOptional<z.ZodInt>>;
    version: z.ZodNonOptional<z.ZodOptional<z.ZodInt>>;
    writtenAt: z.ZodString;
    completed: z.ZodBoolean;
  },
  z.core.$loose
> = PlaybackPositionSchema.unwrap()
  .required()
  .extend({ writtenAt: InstantOut, completed: z.boolean() });

/** `transport.md` §5.6: the profile beside the date ids, never one id at a time. */
export const ViewerProgressBatchBodySchema: z.ZodObject<
  { profileId: z.ZodString; dateIds: z.ZodArray<z.ZodString> },
  z.core.$strip
> = z.object({
  profileId: uuidIn(),
  dateIds: z.array(uuidIn()).min(1).max(BATCH_MAX_IDS),
});

export type ViewerProgress = z.output<typeof ViewerProgressSchema>;
export type ViewerProgressBatchBody = z.output<typeof ViewerProgressBatchBodySchema>;
