import { StreamingServiceTag } from './components.js';
import { datesDocs } from './dates/docs.js';
import { datesExamples } from './dates/examples.js';
import type { RouteDefinition } from '../http/index.js';
import type { ApiDocs, OperationDocumentation } from '../openapi/docs.js';
import { apiDocs, documentationLookup } from '../openapi/docs.js';
import { incidentsDocs } from './incidents/docs.js';
import { incidentsExamples } from './incidents/examples.js';
import { meDocs } from './me/docs.js';
import { meExamples } from './me/examples.js';
import { playbackDocs } from './playback/docs.js';
import { playbackExamples } from './playback/examples.js';
import { viewerProgressDocs } from './viewer-progress/docs.js';
import { viewerProgressExamples } from './viewer-progress/examples.js';

/** The streaming service document's introduction, and the docs and examples its modules register. */
export const streamingServiceDocs: ApiDocs = apiDocs({
  'x-arthome-codes-source': 'ERROR_CODES',
  info: {
    title: 'Arthome Streaming service',
    version: '1.0.0',
    summary: "Streaming's internal API: what the two BFFs call, never a surface.",
    description:
      "Contract of the **streaming service** (D-121). Only the BFFs call it, with the internal token\nthey mint; no surface does, and no route here is public. It is generated from\n`@arthome/contracts/streaming-service-api`, as the BFFs' documents are from theirs.\n\n## One operation, two servers\n\nAn operation a surface reaches through a BFF keeps, here, its operation id, its path, its body,\nits answer and its refusal codes: the BFF relays one shape, and its typed client calls this\ndocument's operation as the surface calls the BFF's. Only what no surface sees, the progress\nbatch, is this document's alone.\n\n## Who calls\n\nEvery route names the BFFs it serves (`x-arthome-requires`, `callerService`): the run desk serves\nthe studio BFF, playback and progress the storefront BFF (D-118). Any other caller is refused\n`403` `api.forbidden`. The caller is read from the token and nowhere else: a body's `profileId`\nor `deviceId` other than the token's is refused `403` `api.forbidden` too, and a route that reads\nthe profile refuses a token that names none the same way: the body never picks the profile.\n\n## What every call carries\n\n`x-arthome-deadline`, past which the service writes nothing and answers `504`\n`api.deadline_exceeded`; `x-arthome-actor-surface` on every write, the place the event it emits\nnames; the surface's `Idempotency-Key`, relayed as is, on a write that takes one;\n`x-arthome-viewer-country` on every call that decides a watch verdict.\n\n## Errors\n\nThe envelope of every Arthome error, and no BFF code: `502`, `503` and `api.upstream_timeout`\nare the BFF's own, answered when this service fails or is too slow.\n",
    contact: {
      name: 'Arthome — architecture',
    },
    license: {
      name: 'UNLICENSED',
    },
  },
  servers: [
    {
      url: 'http://streaming.internal',
      description: 'the cluster network (`transport.md` §5.1)',
    },
  ],
  tags: [
    {
      name: StreamingServiceTag.RUN,
      description: 'The run desk and its incidents, for the studio BFF.',
    },
    {
      name: StreamingServiceTag.PLAYBACK,
      description: "Playback, its sessions and the viewer's progress, for the storefront BFF.",
    },
  ],
  securitySchemes: {
    internalToken: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description:
        "ES256, minted by the BFF for this service alone (`aud: arthome.streaming`) and short-lived\n(`transport.md` §5.2, `adr-auth.md` §8). It names the BFF (`iss`), the account (`sub`) and,\nwhen the session has them, the profile (`pro`) and the device (`did`): the route's principal.\n",
    },
  },
  modules: [datesDocs, incidentsDocs, playbackDocs, meDocs, viewerProgressDocs],
  examples: [
    datesExamples,
    incidentsExamples,
    playbackExamples,
    meExamples,
    viewerProgressExamples,
  ],
});

/** Each streaming service operation's prose and doc-only metadata, by route: for the service's own docs. */
export const streamingServiceDocsOf: (route: RouteDefinition) => OperationDocumentation =
  documentationLookup(streamingServiceDocs);
