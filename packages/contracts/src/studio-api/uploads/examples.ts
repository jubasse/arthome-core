import type { z } from 'zod';

import { PublicationChecklistItem } from '@arthome/core';

import type { CreateUploadTicketBody } from './schemas.js';
import { CreateUploadTicketBodySchema } from './schemas.js';
import type { ModuleExamples } from '../../openapi/docs.js';
import { UploadTicketSchema } from '../../studio-stage/index.js';

const createUploadTicketBody: CreateUploadTicketBody = {
  purpose: PublicationChecklistItem.POSTER,
  contentType: 'image/jpeg',
  sizeBytes: 842000,
};

const uploadTicket: z.output<typeof UploadTicketSchema> = {
  assetId: '019928e9-0000-7000-8000-000000000001',
  uploadUrl: 'https://uploads.arthome.fr/putt/019928e9',
  fields: {
    policy: 'eyJ...',
    signature: 'abc',
  },
  expiresAt: '2026-09-21T19:00:00Z',
};

export const uploadsExamples: ModuleExamples = [
  [CreateUploadTicketBodySchema, [createUploadTicketBody]],
  [UploadTicketSchema, [uploadTicket]],
];
