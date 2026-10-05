import { MemberRole } from '@arthome/core';

import type { EscalateIncidentBody } from './schemas.js';
import {
  EscalateIncidentBodySchema,
  IncidentEscalationSchema,
  IncidentResolutionSchema,
} from './schemas.js';
import type { ModuleExamples } from '../../openapi/docs.js';

const escalateIncidentBody: EscalateIncidentBody = {
  note: 'Flux perdu depuis 4 minutes, la salle ne répond pas.',
};

export const incidentsExamples: ModuleExamples = [
  [EscalateIncidentBodySchema, [escalateIncidentBody]],
  [IncidentResolutionSchema, [{ resolvedAt: '2026-09-21T19:56:00Z' }]],
  [IncidentEscalationSchema, [{ routedToRoles: [MemberRole.ARTIST, MemberRole.PRODUCTION] }]],
];
