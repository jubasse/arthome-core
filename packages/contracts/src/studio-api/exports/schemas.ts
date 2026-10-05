import type { z } from 'zod';

import { uuidIn } from '@arthome/core/schema';

import type { PathParameter } from '../../http/index.js';

export const ExportIdParameter: PathParameter<'exportId', z.ZodString> = {
  name: 'exportId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};
