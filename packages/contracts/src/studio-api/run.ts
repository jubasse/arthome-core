import { z } from 'zod';

import {
  CatalogErrorCode,
  FailureNature,
  INCIDENT_CAUSES,
  INCIDENT_KINDS,
  IncidentCause,
  IncidentKind,
  Locale,
  MemberRole,
  RUN_STATES,
  RunState,
  Service,
} from '@arthome/core';
import type { VocabularyIn, VocabularyOut } from '@arthome/core/schema';
import {
  InstantOut,
  uuidOut,
  vocabularyIn,
  vocabularyOut,
  vocabularyOutLocal,
  uuidIn,
} from '@arthome/core/schema';

import {
  ChannelIdParameter,
  ConflictResponse,
  DateIdParameter,
  ForbiddenResponse,
  IdempotencyKeyParameter,
  IfRightsVersionParameter,
  NotFoundResponse,
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  UnauthorizedResponse,
  operator,
  studioV1,
} from './components.js';
import { StudioEnvelopeMetaSchema, StudioErrorEnvelopeSchema } from '../envelope/index.js';
import { recentAuth, sensitive } from '../http/index.js';
import type {
  JsonRequestBody,
  JsonResponse,
  PathParameter,
  Route,
  IdentifiedAccess,
  ExpectedVersionQuery,
} from '../http/index.js';
import {
  HealthSampleSchema,
  HealthSeriesSchema,
  RunConsoleSchema,
  StreamKeyRevealSchema,
  StudioIncidentSchema,
} from '../studio-stage/index.js';

const runRoutes = studioV1
  .tags(StudioTag.RUN)
  .headers(SurfaceParameter, IfRightsVersionParameter, TraceparentParameter);
const runReads = runRoutes.errors({ 403: ForbiddenResponse });
const runDates = studioV1
  .identity(operator)
  .tags(StudioTag.RUN)
  .headers(SurfaceParameter, TraceparentParameter)
  .errors({ 403: ForbiddenResponse, 404: NotFoundResponse });
const date = runDates.resource('dates', { id: DateIdParameter });
const IncidentIdParameter: PathParameter<'incidentId', z.ZodString> = {
  name: 'incidentId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};
const incidents = date.resource('incidents', { id: IncidentIdParameter });
const ChapterIdParameter: PathParameter<'chapterId', z.ZodString> = {
  name: 'chapterId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};
const chapters = date.path('run').resource('chapters', { id: ChapterIdParameter });

const GET_DATE_TECH_PANE_INGEST_PROTOCOL = ['rtmps', 'srt', 'whip'] as const;
const GET_DATE_TECH_PANE_MONITOR_PATH = ['whep', 'll_hls'] as const;
const SET_RUN_STATE_STATE: readonly [
  typeof RunState.IDLE,
  typeof RunState.REHEARSAL,
  typeof RunState.ON_AIR,
  typeof RunState.ENDED,
] = [RunState.IDLE, RunState.REHEARSAL, RunState.ON_AIR, RunState.ENDED];

export const getDateTechPane: Route<{
  method: 'get';
  version: 1;
  path: '/dates/{dateId}/panes/tech';
  parameters: readonly [
    typeof DateIdParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodObject<
              {
                runState: z.ZodOptional<VocabularyOut>;
                ingestProtocol: z.ZodOptional<VocabularyOut>;
                monitorPath: z.ZodOptional<VocabularyOut>;
                ingestUrl: z.ZodOptional<z.ZodString>;
                technicalCheckPassedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                preflight: z.ZodOptional<
                  z.ZodArray<
                    z.ZodObject<
                      {
                        id: z.ZodOptional<z.ZodString>;
                        satisfied: z.ZodOptional<z.ZodBoolean>;
                        measuredAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                      },
                      z.core.$loose
                    >
                  >
                >;
                qualityLadder: z.ZodOptional<
                  z.ZodArray<
                    z.ZodObject<
                      {
                        renditionId: z.ZodOptional<z.ZodString>;
                        heightPx: z.ZodOptional<z.ZodInt>;
                        enabled: z.ZodOptional<z.ZodBoolean>;
                      },
                      z.core.$loose
                    >
                  >
                >;
                version: z.ZodOptional<z.ZodInt>;
              },
              z.core.$loose
            >;
          },
          z.core.$loose
        >
      >
    >;
    403: typeof ForbiddenResponse;
    404: typeof NotFoundResponse;
  };
}> = date.path('panes').defineRoute({
  method: 'get',
  path: '/tech',
  operationId: 'getDateTechPane',
  summary: "A date's technical pane — pre-flight and broadcast profile.",
  description:
    "Open to `artist`, `production`, `director`, `video`, `sound` and `coordination`. It is a\n`director`'s only pane; it did not exist.\n\n**The stream key does not appear in it**: it appears in no list payload, and revealing it is a\nseparate command, audited and by name.\n",
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.STREAMING],
  responses: {
    200: {
      description: 'Protocol, return path, quality ladder, pre-flight checklist.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z.looseObject({
                runState: vocabularyOut(RUN_STATES).optional(),
                ingestProtocol: vocabularyOutLocal(
                  GET_DATE_TECH_PANE_INGEST_PROTOCOL,
                  'A transport or media capability, not a domain notion: the domain never chooses an ingest protocol, a container or a DRM system, and a new one appears because a device appeared.',
                ).optional(),
                monitorPath: vocabularyOutLocal(
                  GET_DATE_TECH_PANE_MONITOR_PATH,
                  'A transport or media capability, not a domain notion: the domain never chooses an ingest protocol, a container or a DRM system, and a new one appears because a device appeared.',
                ).optional(),
                ingestUrl: z
                  .string()
                  .meta({
                    format: 'uri',
                  })
                  .optional(),
                technicalCheckPassedAt: InstantOut.nullable().optional(),
                preflight: z
                  .array(
                    z.looseObject({
                      id: z.string().optional(),
                      satisfied: z.boolean().optional(),
                      measuredAt: InstantOut.nullable().optional(),
                    }),
                  )
                  .meta({
                    description:
                      'The pre-flight checklist, **served** — each point with its state and its last measurement.',
                  })
                  .optional(),
                qualityLadder: z
                  .array(
                    z.looseObject({
                      renditionId: z.string().optional(),
                      heightPx: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
                      enabled: z.boolean().optional(),
                    }),
                  )
                  .optional(),
                version: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
              }),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:40:20.000Z',
            rightsVersion: 412,
            data: {
              runState: RunState.IDLE,
              ingestProtocol: 'rtmps',
              monitorPath: 'll_hls',
              ingestUrl: 'rtmps://ingest.arthome.fr/live',
              technicalCheckPassedAt: '2026-09-21T18:45:00Z',
              preflight: [
                {
                  id: 'ingest_reachable',
                  satisfied: true,
                  measuredAt: '2026-09-21T18:44:58Z',
                },
              ],
              qualityLadder: [
                {
                  renditionId: '1080p',
                  heightPx: 1080,
                  enabled: true,
                },
              ],
              version: 3,
            },
          },
        },
      },
    },
    404: NotFoundResponse,
  },
});

export const getRunConsole: Route<{
  method: 'get';
  version: 1;
  path: '/dates/{dateId}/run';
  parameters: readonly [
    typeof DateIdParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof RunConsoleSchema }, z.core.$loose>
      >
    >;
    403: typeof ForbiddenResponse;
    404: typeof NotFoundResponse;
  };
}> = date.single('run').find({
  operationId: 'getRunConsole',
  item: RunConsoleSchema,
  summary: 'The state of the run — one call, the whole control-room screen.',
  description:
    '**The return path actually open is served** (`monitorPath`): the studio must **know** it so\nas not to promise the operator a latency it does not have. The contract carries the truth, not\nuniformity — creating a media branch to make a schema uniform would cost more than it returns.\n\n**Two fields, not one**: `state` and `afterGracePeriod`. The studio distinguishes "hiccup\nabsorbed" from "publisher gone", and a two-second network break in a room must produce neither\nan incident nor a manifest restarted from zero.\n\n**The stream key is never here**: it appears in no list payload.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.STREAMING],
  responses: {
    200: {
      description: 'The console.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: RunConsoleSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:20:00.000Z',
            validUntil: '2026-09-21T19:20:15.000Z',
            rightsVersion: 412,
            data: {
              dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
              state: RunState.ON_AIR,
              afterGracePeriod: true,
              ingestProtocol: 'rtmps',
              monitorPath: 'll_hls',
              monitorUrl: 'https://monitor.arthome.fr/a9f1c0/index.m3u8',
              qualityLadder: [
                {
                  renditionId: '1080p',
                  heightPx: 1080,
                  enabled: true,
                },
              ],
              startedAt: '2026-09-21T19:00:12Z',
              lastSample: {
                measuredAt: '2026-09-21T19:19:57Z',
                source: 'ingest_server',
                ingestUpKbps: 8900,
                latencyMs: null,
                droppedPct: 0.1,
                viewers: 1842,
              },
              incident: null,
              chapters: [],
              presence: [
                {
                  personId: '019928b2-0000-7000-8000-00000000000a',
                  displayName: 'Marie J.',
                  roles: [MemberRole.PRODUCTION],
                  lastActivityAt: '2026-09-21T19:19:48Z',
                  isSelf: false,
                },
              ],
              chatThroughputPerMinute: 41,
              version: 3,
            },
          },
        },
      },
    },
    404: NotFoundResponse,
  },
});

export const runTechnicalCheck: Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/run/technical-check';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodObject<
              {
                passed: z.ZodOptional<z.ZodBoolean>;
                passedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                failures: z.ZodOptional<z.ZodArray<z.ZodString>>;
                sample: z.ZodOptional<typeof HealthSampleSchema>;
              },
              z.core.$loose
            >;
          },
          z.core.$loose
        >
      >
    >;
    403: typeof ForbiddenResponse;
    409: typeof ConflictResponse;
    404: typeof ConflictResponse;
  };
}> = date.single('run').action('technical-check', {
  operationId: 'runTechnicalCheck',
  summary: 'Starts the technical check.',
  description:
    'Its success **unlocks publication**: `technical_check_passed` is one of the seven checklist\nitems, and it comes from here. `catalog` **projects** it, it does not ask for it.\n`idle → on_air` is refused as long as the check has never passed.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.STREAMING],
  responses: {
    200: {
      description: "The check's result, and the pre-flight checklist.",
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z.looseObject({
                passed: z.boolean().optional(),
                passedAt: InstantOut.nullable().optional(),
                failures: z.array(z.string()).optional(),
                sample: HealthSampleSchema.optional(),
              }),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:45:00.000Z',
            rightsVersion: 412,
            data: {
              passed: true,
              passedAt: '2026-09-21T18:45:00Z',
              failures: [],
              sample: {
                measuredAt: '2026-09-21T18:44:58Z',
                source: 'ingest_server',
                ingestUpKbps: 9100,
              },
            },
          },
        },
      },
    },
    403: ForbiddenResponse,
    409: ConflictResponse,
  },
});

export const setRunState: Route<{
  method: 'put';
  version: 1;
  path: '/dates/{dateId}/run/state';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  requestBody: JsonRequestBody<
    z.ZodObject<
      { state: VocabularyIn<typeof SET_RUN_STATE_STATE>; expectedVersion: z.ZodInt },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof RunConsoleSchema }, z.core.$loose>
      >
    >;
    409: JsonResponse<typeof StudioErrorEnvelopeSchema>;
    403: typeof ConflictResponse;
    404: typeof ConflictResponse;
  };
}> = date.single('run/state').replace({
  operationId: 'setRunState',
  item: RunConsoleSchema,
  summary: 'Goes on air, rehearses, or cuts the broadcast.',
  description:
    '**The "go on air" command goes to `streaming`, not to `catalog`**: only `streaming` knows\nwhether the feed is arriving. Publication **learns** of it afterwards, by event — two\ntransitions out of eight are caused that way, which leaves `Publication` the aggregate of a\nsingle context.\n\n`idle → on_air` is **refused** if the technical check has never passed.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.STREAMING],
  body: z.object({
    state: vocabularyIn(SET_RUN_STATE_STATE).meta({
      'x-arthome-vocabulary-source': 'RUN_STATES',
      'x-arthome-vocabulary-narrowing':
        '`interrupted` cannot be commanded: it is declared by raiseIncident and reached by consequence. A control room able to set it directly would have two ways into one state and only one raises the incident viewers see.',
      description:
        '**A strict narrowing of `RUN_STATES`, and what it leaves out is the rule.**\n`interrupted` is missing because **it cannot be commanded**: an interruption is\ndeclared by `raiseIncident` and reached by consequence, never by asking for it. A\ncontrol room that could set `interrupted` directly would have two ways into the same\nstate and only one of them would raise the incident the viewers see.\n',
    }),
    expectedVersion: z.int().meta({ minimum: undefined, maximum: undefined }),
  }),
  example: {
    state: RunState.ON_AIR,
    expectedVersion: 3,
  },
  responses: {
    200: {
      description: 'The console up to date.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: RunConsoleSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:00:12.000Z',
            rightsVersion: 412,
            data: {
              dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
              state: RunState.ON_AIR,
              afterGracePeriod: true,
              ingestProtocol: 'rtmps',
              monitorPath: 'll_hls',
              version: 4,
            },
          },
        },
      },
    },
    409: {
      description: '`date.technical_check_required`, or `state.conflict`.',
      content: {
        'application/json': {
          schema: StudioErrorEnvelopeSchema,
          example: {
            error: {
              code: CatalogErrorCode.TECHNICAL_CHECK_REQUIRED,
              nature: FailureNature.REFUSED,
              params: {},
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T19:00:12.000Z',
          },
        },
      },
    },
  },
});

export const setQualityProfile: Route<{
  method: 'put';
  version: 1;
  path: '/dates/{dateId}/run/quality-profile';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        expectedVersion: z.ZodInt;
        renditions: z.ZodArray<
          z.ZodObject<{ renditionId: z.ZodString; enabled: z.ZodBoolean }, z.core.$strip>
        >;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof RunConsoleSchema }, z.core.$loose>
      >
    >;
    409: typeof ConflictResponse;
    403: typeof ConflictResponse;
    404: typeof ConflictResponse;
  };
}> = date.single('run/quality-profile').replace({
  operationId: 'setQualityProfile',
  item: RunConsoleSchema,
  summary: 'Changes the broadcast profile and the quality ladder.',
  description:
    'Named encoding profiles are an **account** preference, not a value local to the workstation.',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.STREAMING],
  body: z.object({
    expectedVersion: z.int().meta({ minimum: undefined, maximum: undefined }),
    renditions: z.array(
      z.object({
        renditionId: z.string(),
        enabled: z.boolean(),
      }),
    ),
  }),
  example: {
    expectedVersion: 4,
    renditions: [
      {
        renditionId: '1080p',
        enabled: true,
      },
      {
        renditionId: '360p',
        enabled: true,
      },
    ],
  },
  responses: {
    200: {
      description: 'Quality ladder up to date.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: RunConsoleSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:02:00.000Z',
            rightsVersion: 412,
            data: {
              dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
              state: RunState.ON_AIR,
              afterGracePeriod: true,
              ingestProtocol: 'rtmps',
              monitorPath: 'll_hls',
              version: 5,
            },
          },
        },
      },
    },
    409: ConflictResponse,
  },
});

export const getHealthSeries: Route<{
  method: 'get';
  version: 1;
  path: '/dates/{dateId}/run/health-samples';
  parameters: readonly [
    typeof DateIdParameter,
    {
      readonly name: 'windowSec';
      readonly in: 'query';
      readonly required: false;
      readonly description: 'The window, in seconds, ending now. The server **caps** it and serves back the window it\napplied (`HealthSeries.windowSec`), rather than refusing: an operator asking for too much\nwants a curve, not an error.\n';
      readonly schema: z.ZodDefault<z.ZodInt>;
    },
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof HealthSeriesSchema }, z.core.$loose>
      >
    >;
    403: typeof ForbiddenResponse;
    404: typeof NotFoundResponse;
  };
}> = date.single('run/health-samples').find({
  operationId: 'getHealthSeries',
  item: HealthSeriesSchema,
  summary: 'The health series over a bounded window — the curve a reconnection re-requests.',
  description:
    '**The write promised a read that did not exist.** `submitHealthSample`\'s own exemption motive\nsays the series "is **re-requested**, it is not replayed", and `realtime.md` §5.1 files a\nbitrate curve under "to throw away" for that same reason — yet nothing could request it, and\n`RunConsole` served `lastSample` alone. One point is not a curve.\n\nThree paths cross this read every evening and none of them is exceptional: after a\n`resume:too_old`, after a reconnection, and simply opening the console in the middle of a\nlive show.\n\n**Bounded by construction.** The window is a parameter, capped, and defaults to the last\nthree minutes — `studio-mobile` asked for it short, and a control room reads the last three\nminutes, not the last three hours.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.STREAMING],
  parameters: [
    {
      name: 'windowSec',
      in: 'query',
      required: false,
      description:
        'The window, in seconds, ending now. The server **caps** it and serves back the window it\napplied (`HealthSeries.windowSec`), rather than refusing: an operator asking for too much\nwants a curve, not an error.\n',
      schema: z.int().min(30).max(3600).default(180),
    },
  ],
  responses: {
    200: {
      description: 'The series over the window actually applied, with its peak.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: HealthSeriesSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T21:40:02.000Z',
            rightsVersion: 412,
            data: {
              windowSec: 180,
              samples: [
                {
                  measuredAt: '2026-09-21T21:39:00Z',
                  source: 'ingest_server',
                  ingestUpKbps: 8900,
                  droppedPct: 0.1,
                  viewers: 412,
                },
                {
                  measuredAt: '2026-09-21T21:39:30Z',
                  source: 'ingest_server',
                  ingestUpKbps: 8700,
                  droppedPct: 0.2,
                  viewers: 431,
                },
              ],
              peakViewers: 431,
              peakViewersAt: '2026-09-21T21:39:30Z',
            },
          },
        },
      },
    },
    404: NotFoundResponse,
  },
});

export const submitHealthSample: Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/run/health-samples';
  parameters: readonly [
    typeof DateIdParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        measuredAt: z.ZodString;
        latencyMs: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
        deviceUpKbps: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
        jitterMs: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
      },
      z.core.$strip
    >
  >;
  responses: {
    202: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<{ accepted: z.ZodOptional<z.ZodBoolean> }, z.core.$loose>
            >;
          },
          z.core.$loose
        >
      >
    >;
    404: typeof NotFoundResponse;
    403: typeof ConflictResponse;
  };
}> = date.single('run/health-samples').create({
  operationId: 'submitHealthSample',
  idempotent: false,
  item: z.looseObject({ accepted: z.boolean().optional() }).optional(),
  summary: 'Submits a measurement taken in the control room — the end-to-end latency.',
  description:
    "**End-to-end latency is a dedicated measurement**, never a native figure presented as one.\nIt is measured by `RTCPeerConnection.getStats()` on the WHEP return path and **submitted**,\nhence `source: client_submitted`. **If it is not measured, it is absent** — never replaced by\na zero.\n\n`deviceUpKbps` measures the workstation's uplink, **not the encoder**: two different bitrates\nnever carry the same name, and only `ingestUpKbps` feeds the pre-flight checklist.\n",
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.STREAMING],
  'x-arthome-idempotency-exemption':
    "**One measurement per second per live show, loss-tolerant.** A replayed sample is one more\nsample in a series; a lost sample is missed by nobody. The series is **re-requested**, it is\nnot replayed — that is already the channel's resume rule.\n",
  body: z.object({
    measuredAt: z
      .string()
      .regex(new RegExp('^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z$'))
      .meta({
        format: 'date-time',
      }),
    latencyMs: z.int().meta({ minimum: undefined, maximum: undefined }).nullable().optional(),
    deviceUpKbps: z.int().meta({ minimum: undefined, maximum: undefined }).nullable().optional(),
    jitterMs: z.int().meta({ minimum: undefined, maximum: undefined }).nullable().optional(),
  }),
  example: {
    measuredAt: '2026-09-21T19:20:00Z',
    latencyMs: 820,
    deviceUpKbps: 4100,
  },
  responses: {
    202: {
      description: 'Measurement accepted. A loss-tolerant write, with no idempotency key.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  accepted: z.boolean().optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:20:01.000Z',
            rightsVersion: 412,
            data: {
              accepted: true,
            },
          },
        },
      },
    },
    404: NotFoundResponse,
  },
});

export const postChapter: Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/run/chapters';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  requestBody: JsonRequestBody<
    z.ZodObject<
      { chapterId: z.ZodString; vocabId: z.ZodString; atMediaSec: z.ZodInt },
      z.core.$strip
    >
  >;
  responses: {
    201: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<
                {
                  id: z.ZodOptional<z.ZodString>;
                  vocabId: z.ZodOptional<z.ZodString>;
                  atMediaSec: z.ZodOptional<z.ZodInt>;
                },
                z.core.$loose
              >
            >;
          },
          z.core.$loose
        >
      >
    >;
    404: typeof NotFoundResponse;
    403: typeof ConflictResponse;
  };
}> = chapters.create({
  operationId: 'postChapter',
  item: z.looseObject({}).optional(),
  summary: 'Sets a chapter, at its position in the media.',
  description:
    "A chapter carries `atMediaSec` — its **position in the media** — never the time it was set.\nIt is free now and unrecoverable later: without it, a replay's chapters are offset by however\nlong the control room took to set them.\n\n`vocabId` is a vocabulary identifier, **never an authored label**.\n",
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.STREAMING],
  body: z.object({
    chapterId: uuidOut(),
    vocabId: z.string(),
    atMediaSec: z.int().min(0).meta({ maximum: undefined }),
  }),
  example: {
    chapterId: '019928d0-0000-7000-8000-000000000001',
    vocabId: 'chapter.second_act',
    atMediaSec: 2760,
  },
  responses: {
    201: {
      description: 'Chapter set.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  id: uuidOut().optional(),
                  vocabId: z.string().optional(),
                  atMediaSec: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:46:00.000Z',
            rightsVersion: 412,
            data: {
              id: '019928d0-0000-7000-8000-000000000001',
              vocabId: 'chapter.second_act',
              atMediaSec: 2760,
            },
          },
        },
      },
    },
    404: NotFoundResponse,
  },
});

export const removeChapter: Route<{
  method: 'delete';
  version: 1;
  path: '/dates/{dateId}/run/chapters/{chapterId}';
  parameters: readonly [
    typeof DateIdParameter,
    typeof ChapterIdParameter,
    typeof IdempotencyKeyParameter,
    ExpectedVersionQuery,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<{ deleted: z.ZodOptional<z.ZodBoolean> }, z.core.$loose>
            >;
          },
          z.core.$loose
        >
      >
    >;
    404: typeof NotFoundResponse;
    403: typeof ConflictResponse;
  };
}> = chapters.delete({
  operationId: 'removeChapter',
  response: z.looseObject({ deleted: z.boolean().optional() }).optional(),
  summary: 'Removes a chapter.',
  description: 'Replayed on an already-removed chapter, it succeeds.',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.STREAMING],
  responses: {
    200: {
      description: 'Chapter removed.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  deleted: z.boolean().optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:47:00.000Z',
            rightsVersion: 412,
            data: {
              deleted: true,
            },
          },
        },
      },
    },
    404: NotFoundResponse,
  },
});

export const raiseIncident: Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/incidents';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        incidentId: z.ZodString;
        kind: VocabularyIn<typeof INCIDENT_KINDS>;
        cause: VocabularyIn<typeof INCIDENT_CAUSES>;
        message: z.ZodObject<{ contentLanguage: z.ZodString; text: z.ZodString }, z.core.$strip>;
      },
      z.core.$strip
    >
  >;
  responses: {
    201: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof StudioIncidentSchema }, z.core.$loose>
      >
    >;
    403: typeof ForbiddenResponse;
    409: typeof ConflictResponse;
    404: typeof ConflictResponse;
  };
}> = incidents.create({
  operationId: 'raiseIncident',
  summary: 'Declares an incident and broadcasts the holding screen.',
  description:
    '**A client-side veil, never a stream switch**: the control plane publishes the state, the\nplayer displays it **over an untouched video**. Instant, identical on all three storefronts,\nand the media stays intact for the resume.\n\n**Cause and outcome are two vocabularies**, and separating them was necessary: the four\nentries in the sources are **outcomes**, while the mobile control room distinguished three\nmore **causes** that existed nowhere.\n\nThe message travels **with its authoring language**. The catalogue supplies **templates** per\nkind of incident, which the control room reuses or replaces.\n\n**Broadcast latency: ≤ 2 s, non-negotiable** — the client-side veil depends on it.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.STREAMING],
  item: StudioIncidentSchema,
  body: z.object({
    incidentId: uuidOut(),
    kind: vocabularyIn(INCIDENT_KINDS).meta({
      'x-arthome-vocabulary-source': 'INCIDENT_KINDS',
    }),
    cause: vocabularyIn(INCIDENT_CAUSES).meta({
      'x-arthome-vocabulary-source': 'INCIDENT_CAUSES',
    }),
    message: z.object({
      contentLanguage: z.string(),
      text: z.string().max(400),
    }),
  }),
  example: {
    incidentId: '019928d1-0000-7000-8000-000000000001',
    kind: IncidentKind.HOLD_SCREEN,
    cause: IncidentCause.VENUE_FEED_LOST,
    message: {
      contentLanguage: Locale.FR,
      text: 'Interruption technique. Nous reprenons dans quelques instants.',
    },
  },
  responses: {
    201: {
      description: 'Incident raised, broadcast in under two seconds.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: StudioIncidentSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:52:00.000Z',
            rightsVersion: 412,
            data: {
              id: '019928d1-0000-7000-8000-000000000001',
              kind: IncidentKind.HOLD_SCREEN,
              cause: IncidentCause.VENUE_FEED_LOST,
              trigger: IncidentCause.MANUAL,
              message: {
                contentLanguage: Locale.FR,
                text: 'Interruption technique. Nous reprenons dans quelques instants.',
              },
              raisedAt: '2026-09-21T19:52:00Z',
              raisedBy: {
                personId: '019928b0-0000-7000-8000-000000000001',
                displayName: 'Claire D.',
                surface: 'studio-mobile',
              },
            },
          },
        },
      },
    },
    403: ForbiddenResponse,
    409: ConflictResponse,
  },
});

export const resolveIncident: Route<{
  method: 'post';
  version: 1;
  path: '/incidents/{incidentId}/resolve';
  parameters: readonly [
    PathParameter<'incidentId', z.ZodString>,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<{ resolvedAt: z.ZodOptional<z.ZodString> }, z.core.$loose>
            >;
          },
          z.core.$loose
        >
      >
    >;
    404: typeof NotFoundResponse;
  };
}> = runRoutes.defineRoute({
  method: 'post',
  path: '/incidents/{incidentId}/resolve',
  operationId: 'resolveIncident',
  summary: 'Resolves the incident and lifts the veil.',
  description:
    'The player **lifts the veil** without asking for a new playback token: otherwise the resume\nwould be paid for with a stream reload, on media that was never cut.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.STREAMING],
  parameters: [
    {
      name: 'incidentId',
      in: 'path',
      required: true,
      schema: uuidIn(),
    },
    IdempotencyKeyParameter,
  ],
  responses: {
    200: {
      description: 'Incident resolved.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  resolvedAt: InstantOut.optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:56:00.000Z',
            rightsVersion: 412,
            data: {
              resolvedAt: '2026-09-21T19:56:00Z',
            },
          },
        },
      },
    },
    404: NotFoundResponse,
  },
});

export const escalateIncidentToProduction: Route<{
  method: 'post';
  version: 1;
  path: '/incidents/{incidentId}/escalate';
  parameters: readonly [
    PathParameter<'incidentId', z.ZodString>,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<z.ZodObject<{ note: z.ZodString }, z.core.$strip>>;
  responses: {
    202: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<{ routedToRoles: z.ZodOptional<z.ZodArray<z.ZodString>> }, z.core.$loose>
            >;
          },
          z.core.$loose
        >
      >
    >;
    404: typeof NotFoundResponse;
  };
}> = runRoutes.defineRoute({
  method: 'post',
  path: '/incidents/{incidentId}/escalate',
  operationId: 'escalateIncidentToProduction',
  summary: 'Escalation to production — the gesture of the roles that do not decide.',
  description:
    '**What a role without `canDecideOutcome` can do.** It declares no outcome; it reports, and\nthe alert is **routed by role and by channel, server-side**. Without this gesture, the only\nrecourse of a stage manager alone in a room would be to phone someone.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.NOTIFICATIONS],
  parameters: [
    {
      name: 'incidentId',
      in: 'path',
      required: true,
      schema: uuidIn(),
    },
    IdempotencyKeyParameter,
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          note: z.string().max(400),
        }),
        example: {
          note: 'Flux perdu depuis 4 minutes, la salle ne répond pas.',
        },
      },
    },
  },
  responses: {
    202: {
      description: 'Escalation routed.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  routedToRoles: z.array(z.string()).optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:57:00.000Z',
            rightsVersion: 412,
            data: {
              routedToRoles: [MemberRole.ARTIST, MemberRole.PRODUCTION],
            },
          },
        },
      },
    },
    404: NotFoundResponse,
  },
});

export const revealStreamKey: Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/stream-key/reveal';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  requestBody: JsonRequestBody<z.ZodObject<{ reauthToken: z.ZodString }, z.core.$strip>>;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof StreamKeyRevealSchema }, z.core.$loose>
      >
    >;
    401: typeof UnauthorizedResponse;
    403: typeof ForbiddenResponse;
    404: typeof ConflictResponse;
  };
}> = date.single('stream-key').action('reveal', {
  operationId: 'revealStreamKey',
  requires: [recentAuth()],
  response: StreamKeyRevealSchema,
  summary: 'Reveals the stream key — a separate command, audited, by name.',
  description:
    "**It is a secret displayed on a phone, in a room, often in front of a contractor.** Four\nguarantees, and they are in the contract because none of them is verifiable client-side:\n\n- the key is **never** in a list payload;\n- revealing it is **this command**, separate, audited and by name;\n- the response carries **`Cache-Control: no-store`** — it must end up neither in the phone's\n  HTTP cache, nor in the application snapshot the OS takes when it goes to the background;\n- **assignment to the `director` slot**, which grants access to the key, is reserved to\n  `artist ∨ production`.\n\n**Re-authentication required**: this is a sensitive operation, and it is asked for **at the\nmoment of the operation**, never on returning to a screen.\n",
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.STREAMING],
  body: z.object({
    reauthToken: sensitive(z.string()).meta({
      description: 'Single-use re-authentication token, short-lived.',
    }),
  }),
  example: {
    reauthToken: 'ott_9f2ac1',
  },
  responses: {
    200: {
      description: 'The key, once, uncached.',
      headers: {
        'Cache-Control': {
          schema: z.literal('no-store'),
          description:
            'Non-negotiable. It is what keeps the secret out of the cache and out of the app snapshot.',
        },
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: StreamKeyRevealSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:40:00.000Z',
            rightsVersion: 412,
            data: {
              streamKey: 'sk_live_9f2ac1b4',
              ingestUrl: 'rtmps://ingest.arthome.fr/live',
              revealedAt: '2026-09-21T18:40:00Z',
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
  },
});

export const rotateStreamKey: Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/stream-key/rotate';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  requestBody: JsonRequestBody<
    z.ZodObject<
      { reauthToken: z.ZodString; confirmDuringRun: z.ZodOptional<z.ZodDefault<z.ZodBoolean>> },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof StreamKeyRevealSchema }, z.core.$loose>
      >
    >;
    409: JsonResponse<typeof StudioErrorEnvelopeSchema>;
    403: typeof ConflictResponse;
    404: typeof ConflictResponse;
  };
}> = date.single('stream-key').action('rotate', {
  operationId: 'rotateStreamKey',
  requires: [recentAuth()],
  response: StreamKeyRevealSchema,
  summary: 'Rotates the stream key — the old one stops broadcasting at once.',
  description:
    '**Immediate**, and the contract says so: the old key stops broadcasting at once. Rotating\n**during a live show** cuts the ingest in progress — the refusal carries a distinct code\n(`date.stream_key_rotation_during_run`) rather than silently executing a command whose consequence\nis dead air.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.STREAMING],
  body: z.object({
    reauthToken: sensitive(z.string()),
    confirmDuringRun: z.boolean().default(false).optional(),
  }),
  example: {
    reauthToken: 'ott_9f2ac1',
    confirmDuringRun: false,
  },
  responses: {
    200: {
      description: 'New key issued.',
      headers: {
        'Cache-Control': {
          schema: z.literal('no-store'),
        },
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: StreamKeyRevealSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:41:00.000Z',
            rightsVersion: 412,
            data: {
              streamKey: 'sk_live_4d77e2',
              ingestUrl: 'rtmps://ingest.arthome.fr/live',
              revealedAt: '2026-09-21T18:41:00Z',
            },
          },
        },
      },
    },
    409: {
      description:
        '`date.stream_key_rotation_during_run` — confirm explicitly, or wait until the end.',
      content: {
        'application/json': {
          schema: StudioErrorEnvelopeSchema,
          example: {
            error: {
              code: CatalogErrorCode.STREAM_KEY_ROTATION_DURING_RUN,
              nature: FailureNature.REFUSED,
              params: {
                runState: RunState.ON_AIR,
              },
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T19:41:00.000Z',
          },
        },
      },
    },
  },
});

export const getChannelStreamSettings: Route<{
  method: 'get';
  version: 1;
  path: '/channels/{channelId}/stream';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodObject<
              {
                ingestUrl: z.ZodOptional<z.ZodString>;
                recommendedProtocol: z.ZodOptional<VocabularyOut>;
                recommendedBitrateKbps: z.ZodOptional<z.ZodInt>;
                lastMeasuredUpKbps: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
                defaults: z.ZodOptional<
                  z.ZodObject<
                    {
                      ingestProtocol: z.ZodOptional<VocabularyOut>;
                      qualityLadder: z.ZodOptional<z.ZodArray<z.ZodString>>;
                      holdScreenAutoAfterSec: z.ZodOptional<z.ZodInt>;
                    },
                    z.core.$loose
                  >
                >;
                recentChecks: z.ZodOptional<
                  z.ZodArray<
                    z.ZodObject<
                      {
                        dateId: z.ZodOptional<z.ZodString>;
                        passed: z.ZodOptional<z.ZodBoolean>;
                        passedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                      },
                      z.core.$loose
                    >
                  >
                >;
                preflightPending: z.ZodOptional<z.ZodInt>;
              },
              z.core.$loose
            >;
          },
          z.core.$loose
        >
      >
    >;
    403: typeof ForbiddenResponse;
  };
}> = runReads.defineRoute({
  method: 'get',
  path: '/channels/{channelId}/stream',
  operationId: 'getChannelStreamSettings',
  summary: "A channel's Broadcast page — ingest server, recommended profile, test history.",
  description:
    '**One of only five entries a control room has**, and it had no operation at all. Taking\n`stream` and `replays` away from a `director` left them an event board.\n\nIt also carries the **broadcast defaults** applied to new dates, which the Settings screen\nannounces and which had no carrier.\n\n**The stream key does not appear in it**: it appears in no list payload.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.STREAMING],
  parameters: [ChannelIdParameter],
  responses: {
    200: {
      description: 'Ingest, recommended profile, measured bitrate, check history.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z.looseObject({
                ingestUrl: z
                  .string()
                  .meta({
                    format: 'uri',
                  })
                  .optional(),
                recommendedProtocol: vocabularyOutLocal(
                  GET_DATE_TECH_PANE_INGEST_PROTOCOL,
                  'A transport or media capability, not a domain notion: the domain never chooses an ingest protocol, a container or a DRM system, and a new one appears because a device appeared.',
                ).optional(),
                recommendedBitrateKbps: z
                  .int()
                  .meta({ minimum: undefined, maximum: undefined })
                  .optional(),
                lastMeasuredUpKbps: z
                  .int()
                  .meta({ minimum: undefined, maximum: undefined })
                  .nullable()
                  .optional(),
                defaults: z
                  .looseObject({
                    ingestProtocol: vocabularyOutLocal(
                      GET_DATE_TECH_PANE_INGEST_PROTOCOL,
                      'A transport or media capability, not a domain notion: the domain never chooses an ingest protocol, a container or a DRM system, and a new one appears because a device appeared.',
                    ).optional(),
                    qualityLadder: z.array(z.string()).optional(),
                    holdScreenAutoAfterSec: z
                      .int()
                      .meta({ minimum: undefined, maximum: undefined })
                      .optional(),
                  })
                  .meta({
                    description: 'Applied to **new** dates, never retroactively.',
                  })
                  .optional(),
                recentChecks: z
                  .array(
                    z.looseObject({
                      dateId: uuidOut().optional(),
                      passed: z.boolean().optional(),
                      passedAt: InstantOut.nullable().optional(),
                    }),
                  )
                  .optional(),
                preflightPending: z
                  .int()
                  .meta({ minimum: undefined, maximum: undefined })
                  .meta({
                    description: 'The `preflightBadge`, **served** — it had no source at all.',
                  })
                  .optional(),
              }),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:12:00.000Z',
            rightsVersion: 412,
            data: {
              ingestUrl: 'rtmps://ingest.arthome.fr/live',
              recommendedProtocol: 'rtmps',
              recommendedBitrateKbps: 6000,
              lastMeasuredUpKbps: 8900,
              defaults: {
                ingestProtocol: 'rtmps',
                qualityLadder: ['1080p', '720p', '360p'],
                holdScreenAutoAfterSec: 15,
              },
              recentChecks: [],
              preflightPending: 1,
            },
          },
        },
      },
    },
  },
});
