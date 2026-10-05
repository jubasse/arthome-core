import type { PublicLinkTarget } from './schemas.js';
import { PublicLinkTargetSchema } from './schemas.js';
import type { ModuleExamples } from '../../openapi/docs.js';

const publicLinkTarget: PublicLinkTarget = {
  kind: 'date',
  id: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
  canonicalUrl: 'https://arthome.fr/show/nuit-blanche/date/2026-09-21',
};

export const resolveExamples: ModuleExamples = [[PublicLinkTargetSchema, [publicLinkTarget]]];
