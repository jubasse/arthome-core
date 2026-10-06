import type { ViewerProgress, ViewerProgressBatchBody } from './schemas.js';
import { ViewerProgressBatchBodySchema, ViewerProgressSchema } from './schemas.js';
import type { ModuleExamples } from '../../openapi/docs.js';

const viewerProgressBatchBody: ViewerProgressBatchBody = {
  profileId: '019928b0-0000-7000-8000-000000000001',
  dateIds: ['019928a0-7d31-7a10-b8c4-2f9e11a4c001', '019928a0-7d31-7a10-b8c4-2f9e11a4c002'],
};

const viewerProgress: ViewerProgress = {
  positionSec: 1840,
  writtenAt: '2026-09-22T21:14:03.000Z',
  completed: false,
  version: 212,
};

export const viewerProgressExamples: ModuleExamples = [
  [ViewerProgressBatchBodySchema, [viewerProgressBatchBody]],
  [ViewerProgressSchema, [viewerProgress]],
];
