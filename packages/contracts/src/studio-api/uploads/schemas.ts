import { z } from 'zod';

import type { VocabularyIn } from '@arthome/core/schema';

import { localVocabulary } from '../../http/index.js';

const UPLOAD_PURPOSES = ['poster', 'wide', 'avatar', 'merch_image'] as const;
const UPLOAD_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const CreateUploadTicketBodySchema: z.ZodObject<
  {
    purpose: VocabularyIn<typeof UPLOAD_PURPOSES>;
    contentType: VocabularyIn<typeof UPLOAD_CONTENT_TYPES>;
    sizeBytes: z.ZodInt;
  },
  z.core.$strip
> = z.object({
  purpose: localVocabulary(
    UPLOAD_PURPOSES,
    'A vocabulary local to this contract. The domain neither produces nor consumes these values — they describe what this endpoint offers, and a new member is an endpoint change.',
  ),
  contentType: localVocabulary(
    UPLOAD_CONTENT_TYPES,
    'A transport or media capability, not a domain notion: the domain never chooses an ingest protocol, a container or a DRM system, and a new one appears because a device appeared.',
  ),
  sizeBytes: z.int().min(1).max(20971520),
});

export type CreateUploadTicketBody = z.output<typeof CreateUploadTicketBodySchema>;
