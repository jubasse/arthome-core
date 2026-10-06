import { ApiErrorCode, DomainErrorCode, InternalTokenIssuer } from '@arthome/core';

import type { ResolveIncidentRoute } from './types.js';
import { callerService, service } from '../../http/index.js';
import {
  IncidentIdParameter,
  IncidentResolutionSchema,
} from '../../studio-api/incidents/schemas.js';
import { StreamingServiceTag, streamingServiceV1 } from '../components.js';

const incidents = streamingServiceV1
  .identity(service)
  .requires(callerService(InternalTokenIssuer.STUDIO_BFF))
  .errors([ApiErrorCode.FORBIDDEN, ApiErrorCode.NOT_FOUND])
  .tags(StreamingServiceTag.RUN)
  .resource('incidents', { id: IncidentIdParameter });

export const resolveIncident: ResolveIncidentRoute = incidents.action('resolve', {
  operationId: 'resolveIncident',
  summary: 'Resolves the incident and lifts the hold screen.',
  response: IncidentResolutionSchema,
  answer: 'Incident resolved.',
  errors: [DomainErrorCode.STATE_CONFLICT],
});
