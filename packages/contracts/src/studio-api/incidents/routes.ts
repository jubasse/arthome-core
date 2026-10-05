import { ApiErrorCode } from '@arthome/core';

import {
  EscalateIncidentBodySchema,
  IncidentEscalationSchema,
  IncidentIdParameter,
  IncidentResolutionSchema,
} from './schemas.js';
import type { EscalateIncidentToProductionRoute, ResolveIncidentRoute } from './types.js';
import {
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  operator,
  studioV1,
} from '../components.js';

const incidents = studioV1
  .identity(operator)
  .headers(SurfaceParameter, TraceparentParameter)
  .errors([ApiErrorCode.FORBIDDEN, ApiErrorCode.NOT_FOUND])
  .tags(StudioTag.RUN)
  .resource('incidents', { id: IncidentIdParameter });

export const resolveIncident: ResolveIncidentRoute = incidents.action('resolve', {
  operationId: 'resolveIncident',
  summary: 'Resolves the incident and lifts the veil.',
  response: IncidentResolutionSchema,
  answer: 'Incident resolved.',
});

export const escalateIncidentToProduction: EscalateIncidentToProductionRoute = incidents.action(
  'escalate',
  {
    operationId: 'escalateIncidentToProduction',
    summary: 'Escalation to production — the gesture of the roles that do not decide.',
    body: EscalateIncidentBodySchema,
    response: IncidentEscalationSchema,
    status: 202,
    answer: 'Escalation routed.',
  },
);
