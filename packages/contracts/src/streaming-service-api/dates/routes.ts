import {
  ApiErrorCode,
  CatalogErrorCode,
  DomainErrorCode,
  InternalTokenIssuer,
} from '@arthome/core';

import type {
  EndRunRoute,
  GetRunConsoleRoute,
  GoOnAirRoute,
  RaiseIncidentRoute,
  RehearseRunRoute,
  ResetRunRoute,
  RunTechnicalCheckRoute,
} from './types.js';
import { callerService, service } from '../../http/index.js';
import { DateIdParameter } from '../../storefront-api/components.js';
import {
  RaiseIncidentBodySchema,
  RunTransitionBodySchema,
  TechnicalCheckSchema,
} from '../../studio-api/dates/schemas.js';
import { IncidentIdParameter } from '../../studio-api/incidents/schemas.js';
import { RunConsoleSchema, StudioIncidentSchema } from '../../studio-stage/index.js';
import { StreamingServiceTag, streamingServiceV1 } from '../components.js';

const runDate = streamingServiceV1
  .identity(service)
  .requires(callerService(InternalTokenIssuer.STUDIO_BFF))
  .errors([ApiErrorCode.FORBIDDEN, ApiErrorCode.NOT_FOUND])
  .tags(StreamingServiceTag.RUN)
  .resource('dates', { id: DateIdParameter });
const run = runDate.single('run');

export const getRunConsole: GetRunConsoleRoute = run.find({
  operationId: 'getRunConsole',
  summary: 'The state of the run — one call, the whole control-room screen.',
  item: RunConsoleSchema,
  answer: 'The console.',
});

export const runTechnicalCheck: RunTechnicalCheckRoute = run.action('technical-check', {
  operationId: 'runTechnicalCheck',
  summary: 'Starts the technical check.',
  response: TechnicalCheckSchema,
  answer: "The check's result, and the pre-flight checklist.",
  errors: [DomainErrorCode.STATE_CONFLICT],
});

export const rehearseRun: RehearseRunRoute = run.action('rehearse', {
  operationId: 'rehearseRun',
  summary: 'Starts the rehearsal.',
  body: RunTransitionBodySchema,
  response: RunConsoleSchema,
  answer: 'The console up to date.',
  errors: [DomainErrorCode.STATE_CONFLICT],
});

export const goOnAir: GoOnAirRoute = run.action('go-on-air', {
  operationId: 'goOnAir',
  summary: 'Goes on air.',
  body: RunTransitionBodySchema,
  response: RunConsoleSchema,
  answer: 'The console up to date.',
  errors: [
    CatalogErrorCode.TECHNICAL_CHECK_REQUIRED,
    DomainErrorCode.STATE_CONFLICT,
    DomainErrorCode.PUBLICATION_TRANSITION_FORBIDDEN,
  ],
});

export const endRun: EndRunRoute = run.action('end', {
  operationId: 'endRun',
  summary: 'Ends the broadcast.',
  body: RunTransitionBodySchema,
  response: RunConsoleSchema,
  answer: 'The console up to date.',
  errors: [DomainErrorCode.STATE_CONFLICT],
});

export const resetRun: ResetRunRoute = run.action('reset', {
  operationId: 'resetRun',
  summary: 'Returns the run to idle.',
  body: RunTransitionBodySchema,
  response: RunConsoleSchema,
  answer: 'The console up to date.',
  errors: [DomainErrorCode.STATE_CONFLICT],
});

export const raiseIncident: RaiseIncidentRoute = runDate
  .resource('incidents', { id: IncidentIdParameter })
  .create({
    operationId: 'raiseIncident',
    summary: 'Declares an incident and broadcasts the holding screen.',
    body: RaiseIncidentBodySchema,
    item: StudioIncidentSchema,
    answer: 'Incident raised, broadcast in under two seconds.',
    errors: [DomainErrorCode.STATE_CONFLICT],
  });
