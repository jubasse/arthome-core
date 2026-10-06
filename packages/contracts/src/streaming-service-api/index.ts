import { ErrorSchema } from '@arthome/core/schema';

import { DateIdParameter } from './components.js';
import {
  endRun,
  getRunConsole,
  goOnAir,
  raiseIncident,
  rehearseRun,
  resetRun,
  runTechnicalCheck,
} from './dates/routes.js';
import { resolveIncident } from './incidents/routes.js';
import { recordPlaybackPosition } from './me/routes.js';
import { openPlayback, releasePlayback, renewPlaybackTicket } from './playback/routes.js';
import { getViewerProgressBatch } from './viewer-progress/routes.js';
import { ViewerProgressSchema } from './viewer-progress/schemas.js';
import { ChapterSchema } from '../catalog/index.js';
import type { Api } from '../http/index.js';
import {
  ActorSurfaceParameter,
  DeadlineParameter,
  IDEMPOTENCY_REPLAYED_HEADER,
  RelayedIdempotencyKeyParameter,
  RelayedTraceparentParameter,
  SERVED_AT_HEADER,
  ServiceBadRequestResponse,
  ServiceConflictResponse,
  ServiceDeadlineExceededResponse,
  ServiceEnvelopeMetaSchema,
  ServiceErrorEnvelopeSchema,
  ServiceForbiddenResponse,
  ServiceInternalErrorResponse,
  ServiceNotFoundResponse,
  ServicePayloadTooLargeResponse,
  ServiceUnauthorizedResponse,
  ServiceUnsupportedMediaTypeResponse,
  ViewerCountryParameter,
  defineApi,
} from '../http/index.js';
import { SurfaceParameter } from '../storefront-api/components.js';
import { PlaybackSessionIdParameter } from '../storefront-api/playback/schemas.js';
import { IncidentSchema, PlaybackRenewalSchema, PlaybackTicketSchema } from '../streaming/index.js';
import { IncidentIdParameter } from '../studio-api/incidents/schemas.js';
import { RunConsoleSchema, StudioIncidentSchema } from '../studio-stage/index.js';

export const streamingServiceApi: Api<{
  getRunConsole: typeof getRunConsole;
  runTechnicalCheck: typeof runTechnicalCheck;
  rehearseRun: typeof rehearseRun;
  goOnAir: typeof goOnAir;
  endRun: typeof endRun;
  resetRun: typeof resetRun;
  raiseIncident: typeof raiseIncident;
  resolveIncident: typeof resolveIncident;
  openPlayback: typeof openPlayback;
  renewPlaybackTicket: typeof renewPlaybackTicket;
  releasePlayback: typeof releasePlayback;
  recordPlaybackPosition: typeof recordPlaybackPosition;
  getViewerProgressBatch: typeof getViewerProgressBatch;
}> = defineApi({
  openapi: '3.1.1',
  security: [{ internalToken: [] }],
  routes: {
    getRunConsole,
    runTechnicalCheck,
    rehearseRun,
    goOnAir,
    endRun,
    resetRun,
    raiseIncident,
    resolveIncident,
    openPlayback,
    renewPlaybackTicket,
    releasePlayback,
    recordPlaybackPosition,
    getViewerProgressBatch,
  },
  components: {
    parameters: {
      Deadline: DeadlineParameter,
      Traceparent: RelayedTraceparentParameter,
      ActorSurface: ActorSurfaceParameter,
      IdempotencyKey: RelayedIdempotencyKeyParameter,
      ViewerCountry: ViewerCountryParameter,
      Surface: SurfaceParameter,
      DateId: DateIdParameter,
      IncidentId: IncidentIdParameter,
      PlaybackSessionId: PlaybackSessionIdParameter,
    },
    headers: {
      ServedAt: SERVED_AT_HEADER,
      IdempotencyReplayed: IDEMPOTENCY_REPLAYED_HEADER,
    },
    responses: {
      BadRequest: ServiceBadRequestResponse,
      Unauthorized: ServiceUnauthorizedResponse,
      Forbidden: ServiceForbiddenResponse,
      NotFound: ServiceNotFoundResponse,
      Conflict: ServiceConflictResponse,
      PayloadTooLarge: ServicePayloadTooLargeResponse,
      UnsupportedMediaType: ServiceUnsupportedMediaTypeResponse,
      InternalError: ServiceInternalErrorResponse,
      DeadlineExceeded: ServiceDeadlineExceededResponse,
    },
    schemas: {
      // envelopes
      EnvelopeMeta: ServiceEnvelopeMetaSchema,
      Error: ErrorSchema,
      ErrorEnvelope: ServiceErrorEnvelopeSchema,
      // the run desk
      RunConsole: RunConsoleSchema,
      StudioIncident: StudioIncidentSchema,
      // playback and progress
      PlaybackTicket: PlaybackTicketSchema,
      PlaybackRenewal: PlaybackRenewalSchema,
      Chapter: ChapterSchema,
      Incident: IncidentSchema,
      ViewerProgress: ViewerProgressSchema,
    },
  },
});
