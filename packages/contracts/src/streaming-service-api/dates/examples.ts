import type { ModuleExamples } from '../../openapi/docs.js';
import {
  RaiseIncidentBodySchema,
  RunTransitionBodySchema,
  TechnicalCheckSchema,
} from '../../studio-api/dates/schemas.js';
import { studioDocs } from '../../studio-api/docs.js';
import { RunConsoleSchema, StudioIncidentSchema } from '../../studio-stage/index.js';

export const datesExamples: ModuleExamples = studioDocs.examples.entriesOf([
  RunTransitionBodySchema,
  RunConsoleSchema,
  TechnicalCheckSchema,
  RaiseIncidentBodySchema,
  StudioIncidentSchema,
]);
