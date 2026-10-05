import type { StudioChanges } from './schemas.js';
import { StudioChangesSchema } from './schemas.js';
import type { ModuleExamples } from '../../openapi/docs.js';

const studioChanges: StudioChanges = {
  servedAt: '2026-09-21T19:45:00.000Z',
  rightsVersion: 412,
  invalidated: ['date:019928a0-7d31-7a10-b8c4-2f9e11a4c001:publication', 'person:inbox'],
  complete: true,
};

export const changesExamples: ModuleExamples = [[StudioChangesSchema, [studioChanges]]];
