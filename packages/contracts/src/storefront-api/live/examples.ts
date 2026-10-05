import type { z } from 'zod';

import { LiveScreenSchema } from '../../catalog/index.js';
import type { ModuleExamples } from '../../openapi/docs.js';

const liveScreen: z.output<typeof LiveScreenSchema> = {
  slots: [{ localHourLabelKey: '20', startsAt: '2026-09-21T18:00:00Z', dates: [] }],
};

export const liveExamples: ModuleExamples = [[LiveScreenSchema, [liveScreen]]];
