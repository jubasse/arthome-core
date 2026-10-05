import { z } from 'zod';

import { uuidIn } from '@arthome/core/schema';

import type { PathParameter } from '../../http/index.js';

export const DateAccessGrantIdParameter: PathParameter<'grantId', z.ZodString> = {
  name: 'grantId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

export const DateAccessRevocationSchema: z.ZodOptional<
  z.ZodObject<{ revoked: z.ZodOptional<z.ZodBoolean> }, z.core.$loose>
> = z.looseObject({ revoked: z.boolean().optional() }).optional();

export type DateAccessRevocation = z.output<typeof DateAccessRevocationSchema>;
