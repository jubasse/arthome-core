import type { z } from 'zod';

import { ChangeFeedSchema } from '../../engagement/index.js';
import type { ModuleExamples } from '../../openapi/docs.js';

const changeFeed: z.output<typeof ChangeFeedSchema> = {
  invalidated: ['date:019928a0-7d31-7a10-b8c4-2f9e11a4c001', 'account:tickets'],
  complete: true,
};

export const changesExamples: ModuleExamples = [[ChangeFeedSchema, [changeFeed]]];
