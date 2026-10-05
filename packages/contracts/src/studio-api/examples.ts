import type { z } from 'zod';

import { Acknowledged, Deleted, ReauthProof } from '../http/index.js';
import type { ModuleExamples } from '../openapi/docs.js';
import { ExportJobSchema } from '../studio-money/index.js';

const exportJob: z.output<typeof ExportJobSchema> = {
  exportId: '019928e8-0000-7000-8000-000000000001',
  kind: 'fec',
  state: 'ready',
  requestedAt: '2026-09-21T18:39:00Z',
  downloadUrl: 'https://files.arthome.fr/exports/019928e8?sig=abc',
  downloadExpiresAt: '2026-09-21T19:44:00Z',
};

/**
 * The examples of the schemas several modules answer: the factories of `./http`, and the records
 * of a subpath more than one module shows. A schema is registered once per api.
 */
export const sharedExamples: ModuleExamples = [
  [Deleted, [{ deleted: true }]],
  [Acknowledged, [{ accepted: true }]],
  [ReauthProof, [{ reauthToken: 'ott_9f2ac1' }]],
  [ExportJobSchema, [exportJob]],
];
