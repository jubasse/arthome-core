import { z } from 'zod';

import {
  ApiErrorCode,
  CrewRole,
  DatePane,
  DisplayState,
  FailureNature,
  RunState,
  Service,
} from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { InstantOut, uuidOut, VOCABULARY_SOURCE_LOCAL, vocabularyIn } from '@arthome/core/schema';

import {
  BadRequestResponse,
  ChannelIdParameter,
  ForbiddenResponse,
  IfRightsVersionParameter,
  NotFoundResponse,
  PageParameter,
  PageSizeParameter,
  RightsVersionHeader,
  SortByParameter,
  SortDirParameter,
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  UnauthorizedResponse,
  studioV1,
} from './components.js';
import { StudioEnvelopeMetaSchema, StudioErrorEnvelopeSchema } from '../envelope/index.js';
import type { JsonResponse, QueryParameter, Route } from '../http/index.js';
import { OffsetPageInfoSchema } from '../pagination/index.js';
import { DutySchema } from '../studio-access/index.js';
import {
  DashboardScreenSchema,
  StatsAudienceSchema,
  StatsSeriesSchema,
} from '../studio-money/index.js';
import { EventsRowSchema } from '../studio-stage/index.js';

const agendaRoutes = studioV1
  .tags(StudioTag.AGENDA)
  .headers(SurfaceParameter, IfRightsVersionParameter, TraceparentParameter);

const LIST_CHANNEL_EVENTS_WINDOW = ['upcoming', 'past'] as const;
const GET_CHANNEL_DASHBOARD_PERIOD = [
  'last_7_days',
  'last_30_days',
  'last_90_days',
  'season',
  'custom',
] as const;
const GET_CHANNEL_STATS_TAB = ['audience', 'series'] as const;

export const listDuties: Route<{
  method: 'get';
  version: 1;
  path: '/me/duties';
  parameters: readonly [
    QueryParameter<'from', z.ZodString, true>,
    QueryParameter<'to', z.ZodString, true>,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ items: z.ZodArray<typeof DutySchema> }, z.core.$loose>
      >
    >;
    401: typeof UnauthorizedResponse;
  };
}> = agendaRoutes.defineRoute({
  method: 'get',
  path: '/me/duties',
  operationId: 'listDuties',
  summary: 'My duties — across all channels, with the overlaps.',
  description:
    '`person_duties` is held by `identity` and carries **all** accessible channels. The overlap is\n**served** (`overlapsWith`), computed once in `@arthome/core`: a surface recomputing it would\nproduce a second implementation of the rule.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY, Service.CATALOG, Service.STREAMING],
  parameters: [
    {
      name: 'from',
      in: 'query',
      required: true,
      schema: InstantOut,
    },
    {
      name: 'to',
      in: 'query',
      required: true,
      schema: InstantOut,
    },
  ],
  responses: {
    200: {
      description: 'The duties in the period.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              items: z.array(DutySchema),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:00:30.000Z',
            rightsVersion: 412,
            items: [
              {
                dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
                channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
                channelName: 'Compagnie Verticale',
                title: 'Nuit blanche',
                crewRole: CrewRole.DIRECTOR,
                startsAt: '2026-09-21T19:00:00Z',
                runState: RunState.IDLE,
                overlapsWith: [],
                accessExpiresAt: '2026-09-21T21:45:00Z',
              },
            ],
          },
        },
      },
    },
    401: UnauthorizedResponse,
  },
});

export const listChannelEvents: Route<{
  method: 'get';
  version: 1;
  path: '/channels/{channelId}/events';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof PageParameter,
    typeof PageSizeParameter,
    typeof SortByParameter,
    typeof SortDirParameter,
    QueryParameter<'window', z.ZodDefault<VocabularyIn<typeof LIST_CHANNEL_EVENTS_WINDOW>>>,
    QueryParameter<'states', z.ZodString>,
    QueryParameter<'q', z.ZodString>,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          { items: z.ZodArray<typeof EventsRowSchema>; page: typeof OffsetPageInfoSchema },
          z.core.$loose
        >
      >
    >;
    403: JsonResponse<typeof StudioErrorEnvelopeSchema>;
    404: typeof NotFoundResponse;
  };
}> = agendaRoutes.defineRoute({
  method: 'get',
  path: '/channels/{channelId}/events',
  operationId: 'listChannelEvents',
  summary: 'The event board — page + total, six sort keys, multi-state filter.',
  description:
    '**Page + total**: the design displays "1–8 OF N" and lists the page numbers. You pin a page\nand send it to a colleague — that is an interface affordance, and it is the reason for the\ndecision.\n\n**Sorting by state follows the state machine\'s canonical order**, not the alphabet:\n`orderRank` travels with the state for exactly that.\n\n**Sorting by revenue is refused** (`api.sort_key_forbidden`) to roles without `canRevenue`, and\nthe field is **absent** from their rows. A sort silently accepted would betray the ordering of\nthe very values one is not allowed to show.\n\nThe temporal split (upcoming / past) and the multi-state filter are **contract parameters**,\nnever a filter applied after fetching: "past" bears on the channel\'s whole history.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.CATALOG, Service.TICKETING],
  parameters: [
    ChannelIdParameter,
    PageParameter,
    PageSizeParameter,
    SortByParameter,
    SortDirParameter,
    {
      name: 'window',
      in: 'query',
      schema: vocabularyIn(LIST_CHANNEL_EVENTS_WINDOW)
        .meta({
          'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
          'x-arthome-vocabulary-reason':
            "A sort or filter key. It is a property of THIS endpoint's list — which orders it offers — not of the domain, and adding one is an endpoint change rather than a vocabulary change.",
        })
        .default('upcoming'),
    },
    {
      name: 'states',
      in: 'query',
      description: '**Multi-state** filter, comma-separated.',
      schema: z.string().meta({
        examples: ['scheduled,technical'],
      }),
    },
    {
      name: 'q',
      in: 'query',
      description: 'Free-text search over the title and the metadata, **server-side**.',
      schema: z.string(),
    },
  ],
  responses: {
    200: {
      description: 'A page of the event board, **projected according to the role**.',
      headers: {
        'X-Arthome-Rights-Version': RightsVersionHeader,
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              items: z.array(EventsRowSchema),
              page: OffsetPageInfoSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:01:00.000Z',
            rightsVersion: 412,
            items: [
              {
                dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
                title: 'Nuit blanche',
                startsAt: '2026-09-21T19:00:00Z',
                state: DisplayState.SCHEDULED,
                orderRank: 3,
                lowestPrice: {
                  amountMinor: 2400,
                  currencyCode: 'EUR',
                },
                fillRateBps: 8700,
                seatsSold: 174,
                grossRevenue: {
                  amountMinor: 417600,
                  currencyCode: 'EUR',
                },
              },
            ],
            page: {
              page: 1,
              pageSize: 20,
              totalItems: 84,
              totalPages: 5,
            },
          },
        },
      },
    },
    403: {
      description:
        '`api.sort_key_forbidden` when the sort key bears on a field absent from this projection.',
      content: {
        'application/json': {
          schema: StudioErrorEnvelopeSchema,
          example: {
            error: {
              code: ApiErrorCode.SORT_KEY_FORBIDDEN,
              nature: FailureNature.REFUSED,
              params: {
                sortBy: 'grossRevenue',
              },
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T18:01:00.000Z',
          },
        },
      },
    },
    404: NotFoundResponse,
  },
});

export const getChannelDashboard: Route<{
  method: 'get';
  version: 1;
  path: '/channels/{channelId}/dashboard';
  parameters: readonly [
    typeof ChannelIdParameter,
    QueryParameter<'period', z.ZodDefault<VocabularyIn<typeof GET_CHANNEL_DASHBOARD_PERIOD>>>,
    QueryParameter<'from', z.ZodString>,
    QueryParameter<'to', z.ZodString>,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof DashboardScreenSchema }, z.core.$loose>
      >
    >;
    400: typeof BadRequestResponse;
    403: typeof ForbiddenResponse;
  };
}> = agendaRoutes.defineRoute({
  method: 'get',
  path: '/channels/{channelId}/dashboard',
  operationId: 'getChannelDashboard',
  summary: 'The dashboard — tiles aggregated over a period, and the "to handle" list.',
  description:
    "**It is the default tab of three personas out of six**, and it had no operation at all.\n\nIt carries **only what had no carrier**: the aggregated tiles and the routed list. Everything\nelse on that screen is a recomposition of collections already served — the next dates and the\ncountdown card come from `listChannelEvents`, revenue per date from `listPayouts`, dates held\nin reserve from `listChannelEvents?state=reserve`, and the countdown **is computed locally**\nagainst `startsAt` and the channel's `serverTime`, as the contract prescribes everywhere else.\nAsking for them again here would have been the value composed in two places.\n",
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.CATALOG, Service.TICKETING, Service.STREAMING, DatePane.CHAT],
  'x-arthome-freshness': 300,
  parameters: [
    ChannelIdParameter,
    {
      name: 'period',
      in: 'query',
      schema: vocabularyIn(GET_CHANNEL_DASHBOARD_PERIOD)
        .meta({
          'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
          'x-arthome-vocabulary-reason':
            'A period selector for this screen. The bounds it resolves to are served (`seasonBounds`, `periodStart`/`periodEnd`); this only names which preset the person chose.',
        })
        .default('last_30_days'),
    },
    {
      name: 'from',
      in: 'query',
      description: 'Requis quand `period` vaut `custom`.',
      schema: z.string().meta({
        format: 'date',
      }),
    },
    {
      name: 'to',
      in: 'query',
      schema: z.string().meta({
        format: 'date',
      }),
    },
  ],
  responses: {
    200: {
      description: 'Tiles and reminders, projected according to the role.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: DashboardScreenSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:05:00.000Z',
            rightsVersion: 412,
            data: {
              period: {
                preset: 'last_30_days',
                from: '2026-08-22',
                to: '2026-09-21',
                days: 30,
                datesCovered: 7,
              },
              tiles: [
                {
                  id: 'shop_sales',
                  value: 184200,
                  unit: 'currency_minor',
                  currencyCode: 'EUR',
                  seriesGranularity: 'per_date',
                  series: [
                    {
                      at: '2026-09-04T19:00:00Z',
                      value: 42100,
                      dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
                    },
                  ],
                },
                {
                  id: 'followers_gained',
                  value: 312,
                  unit: 'count',
                  seriesGranularity: 'per_date',
                  series: [
                    {
                      at: '2026-09-04T19:00:00Z',
                      value: 48,
                    },
                  ],
                },
                {
                  id: 'replay_views',
                  value: 1840,
                  unit: 'count',
                  seriesGranularity: 'per_date',
                  series: [
                    {
                      at: '2026-09-04T19:00:00Z',
                      value: 412,
                    },
                  ],
                },
                {
                  id: 'fill_rate',
                  value: 87,
                  unit: 'percent',
                  seriesGranularity: 'per_date',
                  series: [
                    {
                      at: '2026-09-04T19:00:00Z',
                      value: 84,
                    },
                  ],
                },
              ],
              reminders: [
                {
                  id: 'rem-1',
                  kind: 'technical_check_missing',
                  severity: 'urgent',
                  textCode: 'dashboard.reminder.technical_check_missing',
                  params: {
                    title: 'Nuit blanche',
                  },
                  targetPage: 'regie',
                  dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
                  countdownTo: '2026-09-21T19:00:00Z',
                  actionable: true,
                },
              ],
              revenueByDate: {
                total: {
                  amountMinor: 14049600,
                  currencyCode: 'EUR',
                },
                totalScope: 'channel_period',
                items: [
                  {
                    dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
                    title: 'Nuit blanche',
                    startsAt: '2026-09-21T19:00:00Z',
                    gross: {
                      amountMinor: 417600,
                      currencyCode: 'EUR',
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
    400: BadRequestResponse,
    403: ForbiddenResponse,
  },
});

export const getChannelStats: Route<{
  method: 'get';
  version: 1;
  path: '/channels/{channelId}/stats';
  parameters: readonly [
    typeof ChannelIdParameter,
    QueryParameter<'tab', z.ZodDefault<VocabularyIn<typeof GET_CHANNEL_STATS_TAB>>>,
    QueryParameter<'period', z.ZodDefault<VocabularyIn<typeof GET_CHANNEL_DASHBOARD_PERIOD>>>,
    QueryParameter<'from', z.ZodString>,
    QueryParameter<'to', z.ZodString>,
    QueryParameter<'showId', z.ZodString>,
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
            audience: z.ZodOptional<typeof StatsAudienceSchema>;
            series: z.ZodOptional<typeof StatsSeriesSchema>;
          },
          z.core.$loose
        >
      >
    >;
    400: typeof BadRequestResponse;
    403: typeof ForbiddenResponse;
  };
}> = agendaRoutes.defineRoute({
  method: 'get',
  path: '/channels/{channelId}/stats',
  operationId: 'getChannelStats',
  summary: 'Audience and revenue, or a comparison of the dates in a series.',
  description:
    'Two tabs, one path. The `stats_csv` export already existed: **one could export a statistic\none could not read.**\n\nThe screen\'s title varies with the role — "Audience and revenue" under `canRevenue`,\n"Audience" otherwise — and it is the **projection** that decides it: without `canRevenue`, the\nrevenue fields are **absent**, not masked.\n\n**Where viewers came from is not served**: see `StatsAudience`. It is the only point on these\ntwo screens that required a datum the system produces nowhere.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.CATALOG, Service.TICKETING, Service.STREAMING],
  'x-arthome-freshness': 300,
  parameters: [
    ChannelIdParameter,
    {
      name: 'tab',
      in: 'query',
      schema: vocabularyIn(GET_CHANNEL_STATS_TAB)
        .meta({
          'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
          'x-arthome-vocabulary-reason':
            "A sort or filter key. It is a property of THIS endpoint's list — which orders it offers — not of the domain, and adding one is an endpoint change rather than a vocabulary change.",
        })
        .default('audience'),
    },
    {
      name: 'period',
      in: 'query',
      schema: vocabularyIn(GET_CHANNEL_DASHBOARD_PERIOD)
        .meta({
          'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
          'x-arthome-vocabulary-reason':
            'A period selector for this screen. The bounds it resolves to are served (`seasonBounds`, `periodStart`/`periodEnd`); this only names which preset the person chose.',
        })
        .default('last_30_days'),
    },
    {
      name: 'from',
      in: 'query',
      schema: z.string().meta({
        format: 'date',
      }),
    },
    {
      name: 'to',
      in: 'query',
      schema: z.string().meta({
        format: 'date',
      }),
    },
    {
      name: 'showId',
      in: 'query',
      description: 'Restricts the `series` tab to one series. Absent, every series is served.',
      schema: uuidOut(),
    },
  ],
  responses: {
    200: {
      description: 'The tab requested. `audience` and `series` are mutually exclusive.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              audience: StatsAudienceSchema.optional(),
              series: StatsSeriesSchema.optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:06:00.000Z',
            rightsVersion: 412,
            audience: {
              period: {
                preset: 'last_30_days',
                from: '2026-08-22',
                to: '2026-09-21',
                days: 30,
                datesCovered: 7,
              },
              headline: {
                viewersTotal: 18420,
                averageFillRateBps: 8700,
                datesCount: 7,
                netRevenue: {
                  amountMinor: 1240000,
                  currencyCode: 'EUR',
                },
              },
              fillByDate: [
                {
                  dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
                  title: 'Nuit blanche',
                  startsAt: '2026-09-21T19:00:00Z',
                  fillRateBps: 8700,
                  seatsSold: 174,
                  capacityTotal: 200,
                  onSale: true,
                },
              ],
              audienceByDate: [
                {
                  dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
                  title: 'Nuit blanche',
                  startsAt: '2026-09-21T19:00:00Z',
                  displayState: DisplayState.LIVE,
                  seatsSold: 174,
                  liveViewersPeak: 1842,
                  replayViews: 412,
                  fillRateBps: 8700,
                },
              ],
            },
          },
        },
      },
    },
    400: BadRequestResponse,
    403: ForbiddenResponse,
  },
});

export const getChannelAgenda: Route<{
  method: 'get';
  version: 1;
  path: '/channels/{channelId}/agenda';
  parameters: readonly [
    typeof ChannelIdParameter,
    QueryParameter<'from', z.ZodString, true>,
    QueryParameter<'to', z.ZodString, true>,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ items: z.ZodArray<typeof EventsRowSchema> }, z.core.$loose>
      >
    >;
    404: typeof NotFoundResponse;
  };
}> = agendaRoutes.defineRoute({
  method: 'get',
  path: '/channels/{channelId}/agenda',
  operationId: 'getChannelAgenda',
  summary: "A channel's schedule, over a period.",
  description:
    'Composed by `catalog` and fed by `ticketing` for the capacity and the revenue. The revenue is\n**absent** without `canRevenue` — and that is why the schedule served to a control room has no\n`grossRevenue` field, while the one served to the treasury has no stream key.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.CATALOG, Service.TICKETING],
  parameters: [
    ChannelIdParameter,
    {
      name: 'from',
      in: 'query',
      required: true,
      schema: z.string().meta({
        format: 'date',
      }),
    },
    {
      name: 'to',
      in: 'query',
      required: true,
      schema: z.string().meta({
        format: 'date',
      }),
    },
  ],
  responses: {
    200: {
      description: 'The dates in the period.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              items: z.array(EventsRowSchema),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:01:20.000Z',
            rightsVersion: 412,
            items: [],
          },
        },
      },
    },
    404: NotFoundResponse,
  },
});
