import type { z } from 'zod';

import { RailSchema } from '../../catalog/index.js';
import type { ModuleExamples } from '../../openapi/docs.js';

const rail: z.output<typeof RailSchema> = {
  id: 'cat-dance-contemporary',
  titleCode: 'home.rail.category',
  kind: 'category',
  itemKind: 'date',
  cardForm: 'wide',
  items: [],
  total: 84,
  totalIsLowerBound: false,
  nextCursor: null,
};

export const railsExamples: ModuleExamples = [[RailSchema, [rail]]];
