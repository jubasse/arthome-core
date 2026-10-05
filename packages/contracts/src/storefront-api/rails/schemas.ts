import { z } from 'zod';

import type { PathParameter } from '../../http/index.js';

export const RailIdParameter: PathParameter<'railId', z.ZodString> = {
  name: 'railId',
  in: 'path',
  required: true,
  description: 'The `id` carried by the rail, never a string built by the surface.',
  schema: z.string(),
};
