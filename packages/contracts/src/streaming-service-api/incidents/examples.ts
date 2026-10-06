import type { ModuleExamples } from '../../openapi/docs.js';
import { studioDocs } from '../../studio-api/docs.js';
import { IncidentResolutionSchema } from '../../studio-api/incidents/schemas.js';

export const incidentsExamples: ModuleExamples = studioDocs.examples.entriesOf([
  IncidentResolutionSchema,
]);
