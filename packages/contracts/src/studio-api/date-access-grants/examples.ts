import { DateAccessRevocationSchema } from './schemas.js';
import type { ModuleExamples } from '../../openapi/docs.js';

export const dateAccessGrantsExamples: ModuleExamples = [
  [DateAccessRevocationSchema, [{ revoked: true }]],
];
