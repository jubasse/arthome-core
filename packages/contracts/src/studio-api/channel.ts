import { z } from 'zod';

import {
  AudienceSanction,
  CatalogErrorCode,
  ChannelErrorCode,
  CHAT_MODES,
  ChatMode,
  DatePane,
  DisplayState,
  FailureNature,
  FILTER_SEVERITIES,
  FilterSeverity,
  Locale,
  PublicationChecklistItem,
  Service,
  Surface,
} from '@arthome/core';
import type { VocabularyIn, VocabularyOut } from '@arthome/core/schema';
import {
  InstantOut,
  MoneyOut,
  uuidOut,
  VOCABULARY_SOURCE_LOCAL,
  vocabularyIn,
  vocabularyOut,
  vocabularyOutLocal,
  uuidIn,
  dateTimeIn,
} from '@arthome/core/schema';

import {
  BadRequestResponse,
  ChannelIdParameter,
  ConflictResponse,
  DateIdParameter,
  ForbiddenResponse,
  IdempotencyKeyParameter,
  IfRightsVersionParameter,
  NotFoundResponse,
  PageParameter,
  PageSizeParameter,
  SortByParameter,
  SortDirParameter,
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  studioV1,
} from './components.js';
import { StudioEnvelopeMetaSchema, StudioErrorEnvelopeSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, QueryParameter, Route } from '../http/index.js';
import { OffsetPageInfoSchema } from '../pagination/index.js';
import { JournalEntrySchema } from '../studio-desk/index.js';
import { MerchItemAdminSchema, UploadTicketSchema } from '../studio-stage/index.js';

const channelRoutes = studioV1
  .tags(StudioTag.CHANNEL)
  .headers(SurfaceParameter, IfRightsVersionParameter, TraceparentParameter);
const channelReads = channelRoutes.errors({ 403: ForbiddenResponse });
const channelWrites = channelRoutes.headers(IdempotencyKeyParameter);

const LIST_CHANNEL_REPLAYS_STATE = ['online', 'expired', 'archived'] as const;
const GET_CHANNEL_SETTINGS_SOURCE = [
  'shopify',
  'woocommerce',
  'prestashop',
  'drupal',
  'api',
] as const;
const UPDATE_CHANNEL_SETTINGS_INGEST_PROTOCOL = ['rtmps', 'srt', 'whip'] as const;
const LIST_CHANNEL_JOURNAL_NATURE = ['air', 'mod', 'event', 'access', 'money'] as const;
const CREATE_UPLOAD_TICKET_PURPOSE = ['poster', 'wide', 'avatar', 'merch_image'] as const;
const CREATE_UPLOAD_TICKET_CONTENT_TYPE = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const deleteChannel: Route<{
  method: 'delete';
  version: 1;
  path: '/channels/{channelId}';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<{ reauthToken: z.ZodString; confirmName: z.ZodString }, z.core.$strip>
  >;
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
    409: JsonResponse<typeof StudioErrorEnvelopeSchema>;
  };
}> = channelWrites.defineRoute({
  method: 'delete',
  path: '/channels/{channelId}',
  operationId: 'deleteChannel',
  summary: 'Deletes a channel.',
  description:
    '**Refused while a date remains on sale or a payout is owed.** These facts are **projected\nand held locally** by `identity` (`channel_dues`), never asked of `ticketing` or `payouts`\nsynchronously: that is precisely the kind of call "no synchronous call between services"\nforbids.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  parameters: [ChannelIdParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          reauthToken: z.string(),
          confirmName: z.string(),
        }),
        example: {
          reauthToken: 'ott_9f2ac1',
          confirmName: 'Compagnie Verticale',
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Channel deleted.',
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
            servedAt: '2026-09-21T18:22:00.000Z',
            rightsVersion: 413,
            data: {
              deleted: true,
            },
          },
        },
      },
    },
    409: {
      description: '`channel.has_open_obligations`, with the detail.',
      content: {
        'application/json': {
          schema: StudioErrorEnvelopeSchema,
          example: {
            error: {
              code: ChannelErrorCode.CHANNEL_HAS_OPEN_OBLIGATIONS,
              nature: FailureNature.REFUSED,
              params: {
                datesOnSale: 3,
                payoutsDue: 1,
              },
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T18:22:00.000Z',
          },
        },
      },
    },
  },
});

export const listChannelReplays: Route<{
  method: 'get';
  version: 1;
  path: '/channels/{channelId}/replays';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof PageParameter,
    typeof PageSizeParameter,
    typeof SortByParameter,
    typeof SortDirParameter,
    QueryParameter<'state', VocabularyIn<typeof LIST_CHANNEL_REPLAYS_STATE>>,
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
            items: z.ZodArray<
              z.ZodObject<
                {
                  dateId: z.ZodString;
                  title: z.ZodString;
                  state: VocabularyOut;
                  expiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                  durationSec: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
                  views: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
                  revenue: z.ZodOptional<typeof MoneyOut>;
                },
                z.core.$loose
              >
            >;
            page: typeof OffsetPageInfoSchema;
          },
          z.core.$loose
        >
      >
    >;
    403: typeof ForbiddenResponse;
  };
}> = channelReads.defineRoute({
  method: 'get',
  path: '/channels/{channelId}/replays',
  operationId: 'listChannelReplays',
  summary: "A channel's replay catalogue — online and archived.",
  description:
    '`reopenReplayWindow` allowed you to **reopen a window you could not see**. It is also the\nscreen where you notice that a window closes in twenty-four hours — which the inbox already\nannounces with an alert.\n\nPage + total, like every stable collection in the studio.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.STREAMING, Service.CATALOG, Service.TICKETING],
  parameters: [
    ChannelIdParameter,
    PageParameter,
    PageSizeParameter,
    SortByParameter,
    SortDirParameter,
    {
      name: 'state',
      in: 'query',
      schema: vocabularyIn(LIST_CHANNEL_REPLAYS_STATE).meta({
        'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
        'x-arthome-vocabulary-reason':
          "A state machine local to this resource. It is the contract's own, not the domain's: the domain owns the facts, this owns how far a request has got.",
      }),
    },
  ],
  responses: {
    200: {
      description:
        'A page of replays, **projected according to the role** — revenue is absent without `canRevenue`.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              items: z.array(
                z.looseObject({
                  dateId: uuidOut(),
                  title: z.string(),
                  state: vocabularyOutLocal(
                    LIST_CHANNEL_REPLAYS_STATE,
                    "A state machine local to this resource. It is the contract's own, not the domain's: the domain owns the facts, this owns how far a request has got.",
                  ),
                  expiresAt: InstantOut.nullable().optional(),
                  durationSec: z
                    .int()
                    .meta({ minimum: undefined, maximum: undefined })
                    .nullable()
                    .optional(),
                  views: z
                    .int()
                    .meta({ minimum: undefined, maximum: undefined })
                    .nullable()
                    .optional(),
                  revenue: MoneyOut.meta({
                    'x-arthome-tax-basis': 'inclusive',
                    description: '**Absent** without `canRevenue`.',
                  }).optional(),
                }),
              ),
              page: OffsetPageInfoSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:13:00.000Z',
            rightsVersion: 412,
            items: [
              {
                dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
                title: 'Nuit blanche',
                state: 'online',
                expiresAt: '2026-09-24T22:00:00Z',
                durationSec: 5700,
                views: 412,
              },
            ],
            page: {
              page: 1,
              pageSize: 20,
              totalItems: 18,
              totalPages: 1,
            },
          },
        },
      },
    },
  },
});

export const getChannelSettings: Route<{
  method: 'get';
  version: 1;
  path: '/channels/{channelId}/settings';
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
                identity: z.ZodOptional<
                  z.ZodObject<
                    {
                      publicName: z.ZodOptional<z.ZodString>;
                      slug: z.ZodOptional<z.ZodString>;
                      categoryId: z.ZodOptional<z.ZodString>;
                      verified: z.ZodOptional<z.ZodBoolean>;
                      version: z.ZodOptional<z.ZodInt>;
                    },
                    z.core.$loose
                  >
                >;
                moderationDefaults: z.ZodOptional<
                  z.ZodObject<
                    {
                      filterSeverity: z.ZodOptional<VocabularyOut>;
                      slowModeSec: z.ZodOptional<z.ZodInt>;
                      holdersOnly: z.ZodOptional<z.ZodBoolean>;
                      retroactiveFilter: z.ZodOptional<z.ZodBoolean>;
                      chatMode: z.ZodOptional<VocabularyOut>;
                      version: z.ZodOptional<z.ZodInt>;
                    },
                    z.core.$loose
                  >
                >;
                merchIntegration: z.ZodOptional<
                  z.ZodNullable<
                    z.ZodObject<
                      {
                        source: z.ZodOptional<VocabularyOut>;
                        merchantUrl: z.ZodOptional<z.ZodString>;
                        connectedAt: z.ZodOptional<z.ZodString>;
                        lastSyncedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                      },
                      z.core.$loose
                    >
                  >
                >;
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
}> = channelReads.defineRoute({
  method: 'get',
  path: '/channels/{channelId}/settings',
  operationId: 'getChannelSettings',
  summary: "A channel's settings — the screen had nothing to read before writing.",
  description:
    '`PATCH /channels/{id}/identity` existed **without a GET**. Two further blocks that had no\ncarrier join it: the **moderation defaults**, and the **merchant integration** — one at a time\nper channel.\n\nThe moderation block settles a defect the surface named: `filterSeverity`, `slowModeSec`,\n`holdersOnly` and `retroactiveFilter` lived **only** on `PUT /dates/{id}/chat-policy`, hence\n**per date, with a date\'s `expectedVersion`**. Yet off air there is no date to point at, and\nthe design says the opposite in so many words: *"the dictionary, the severity and the\nsanctions stay editable off air — they will apply to the next live show"*. The dictionary was\nalready at channel level; the other three were not.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.CATALOG, DatePane.CHAT, Service.STREAMING, Service.TICKETING],
  parameters: [ChannelIdParameter],
  responses: {
    200: {
      description:
        'Public identity, moderation defaults, broadcast defaults, merchant integration.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z.looseObject({
                identity: z
                  .looseObject({
                    publicName: z.string().optional(),
                    slug: z.string().optional(),
                    categoryId: z.string().optional(),
                    verified: z.boolean().optional(),
                    version: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
                  })
                  .optional(),
                moderationDefaults: z
                  .looseObject({
                    filterSeverity: vocabularyOut(FILTER_SEVERITIES).optional(),
                    slowModeSec: z
                      .int()
                      .meta({ minimum: undefined, maximum: undefined })
                      .optional(),
                    holdersOnly: z.boolean().optional(),
                    retroactiveFilter: z.boolean().optional(),
                    chatMode: vocabularyOut(CHAT_MODES).optional(),
                    version: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
                  })
                  .meta({
                    description:
                      '**Inherited by a new date at creation**, never applied retroactively\nto an existing date — otherwise a channel setting would change the\nregime of a live show in progress.\n',
                  })
                  .optional(),
                merchIntegration: z
                  .looseObject({
                    source: vocabularyOutLocal(
                      GET_CHANNEL_SETTINGS_SOURCE,
                      'An external provider or platform identifier. It is their vocabulary, not ours, and it changes when they change.',
                    ).optional(),
                    merchantUrl: z
                      .string()
                      .meta({
                        format: 'uri',
                      })
                      .optional(),
                    connectedAt: InstantOut.optional(),
                    lastSyncedAt: InstantOut.nullable().optional(),
                  })
                  .nullable()
                  .meta({
                    description: '**One at a time.** `null` when the shop is served by Arthome.',
                  })
                  .optional(),
              }),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:49:00.000Z',
            rightsVersion: 412,
            data: {
              identity: {
                publicName: 'Compagnie Verticale',
                slug: 'compagnie-verticale',
                categoryId: 'dance-contemporary',
                verified: true,
                version: 5,
              },
              moderationDefaults: {
                filterSeverity: FilterSeverity.MEDIUM,
                slowModeSec: 0,
                holdersOnly: false,
                retroactiveFilter: true,
                chatMode: ChatMode.OPEN,
                version: 2,
              },
              merchIntegration: null,
            },
          },
        },
      },
    },
  },
});

export const updateChannelSettings: Route<{
  method: 'patch';
  version: 1;
  path: '/channels/{channelId}/settings';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        expectedVersion: z.ZodInt;
        moderationDefaults: z.ZodOptional<
          z.ZodObject<
            {
              filterSeverity: z.ZodOptional<VocabularyIn<typeof FILTER_SEVERITIES>>;
              slowModeSec: z.ZodOptional<z.ZodInt>;
              holdersOnly: z.ZodOptional<z.ZodBoolean>;
              retroactiveFilter: z.ZodOptional<z.ZodBoolean>;
              chatMode: z.ZodOptional<VocabularyIn<typeof CHAT_MODES>>;
            },
            z.core.$strip
          >
        >;
        broadcastDefaults: z.ZodOptional<
          z.ZodObject<
            {
              ingestProtocol: z.ZodOptional<
                VocabularyIn<typeof UPDATE_CHANNEL_SETTINGS_INGEST_PROTOCOL>
              >;
              holdScreenAutoAfterSec: z.ZodOptional<z.ZodInt>;
            },
            z.core.$strip
          >
        >;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          { data: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>> },
          z.core.$loose
        >
      >
    >;
    403: typeof ForbiddenResponse;
    409: typeof ConflictResponse;
  };
}> = channelWrites.defineRoute({
  method: 'patch',
  path: '/channels/{channelId}/settings',
  operationId: 'updateChannelSettings',
  summary: "Writes a channel's moderation and broadcast defaults.",
  description:
    "**The write counterpart of `getChannelSettings`** — without it I had just created a\nread-only screen, that is, exactly the defect this batch corrects elsewhere.\n\nIt settles the **off-air** gesture: filter severity, slow mode and holders-only are set here,\nat channel level, with no date to point at. The public identity stays on its own path,\nbecause it is a pure `catalog` write and because a channel's two faces never mix.\n\n**The defaults are inherited when a date is created, never applied retroactively**: a channel\nsetting does not change the regime of a live show in progress.\n",
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [DatePane.CHAT, Service.STREAMING],
  parameters: [ChannelIdParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          expectedVersion: z.int().meta({ minimum: undefined, maximum: undefined }),
          moderationDefaults: z
            .object({
              filterSeverity: vocabularyIn(FILTER_SEVERITIES)
                .meta({
                  'x-arthome-vocabulary-source': 'FILTER_SEVERITIES',
                })
                .optional(),
              slowModeSec: z.int().min(0).max(300).optional(),
              holdersOnly: z.boolean().optional(),
              retroactiveFilter: z.boolean().optional(),
              chatMode: vocabularyIn(CHAT_MODES)
                .meta({
                  'x-arthome-vocabulary-source': 'CHAT_MODES',
                })
                .optional(),
            })
            .optional(),
          broadcastDefaults: z
            .object({
              ingestProtocol: vocabularyIn(UPDATE_CHANNEL_SETTINGS_INGEST_PROTOCOL)
                .meta({
                  'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
                  'x-arthome-vocabulary-reason':
                    'A transport or media capability, not a domain notion: the domain never chooses an ingest protocol, a container or a DRM system, and a new one appears because a device appeared.',
                })
                .optional(),
              holdScreenAutoAfterSec: z.int().min(5).max(120).optional(),
            })
            .optional(),
        }),
        example: {
          expectedVersion: 2,
          moderationDefaults: {
            filterSeverity: FilterSeverity.HIGH,
            slowModeSec: 5,
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Settings up to date.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z.looseObject({}).optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:49:30.000Z',
            rightsVersion: 412,
            data: {
              moderationDefaults: {
                filterSeverity: FilterSeverity.HIGH,
                slowModeSec: 5,
                holdersOnly: false,
                retroactiveFilter: true,
                chatMode: ChatMode.OPEN,
                version: 3,
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

export const listChannelJournal: Route<{
  method: 'get';
  version: 1;
  path: '/channels/{channelId}/journal';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof PageParameter,
    typeof PageSizeParameter,
    QueryParameter<'from', z.ZodString, true>,
    QueryParameter<'to', z.ZodString, true>,
    QueryParameter<'nature', VocabularyIn<typeof LIST_CHANNEL_JOURNAL_NATURE>>,
    QueryParameter<'dateId', z.ZodString>,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          { items: z.ZodArray<typeof JournalEntrySchema>; page: typeof OffsetPageInfoSchema },
          z.core.$loose
        >
      >
    >;
    400: typeof BadRequestResponse;
    403: typeof ForbiddenResponse;
  };
}> = channelReads.defineRoute({
  method: 'get',
  path: '/channels/{channelId}/journal',
  operationId: 'listChannelJournal',
  summary: 'The audit log — page + total, **mandatory period filter**.',
  description:
    '**The audit log stays on page + total** (D-010), with a **mandatory period filter**. Nobody\npages to the 50,000th entry of a 24-month log: you filter by period first, which keeps the\npage numbers — the affordance wanted — and stays fast. Moving to a cursor would trade a\nproblem we do not have against the loss of what we wanted.\n\n`from` and `to` are **required**, and too wide a range is refused with\n`api.period_filter_required`, with the maximum range as a parameter.\n\nIt **names names and places them**, kept for 24 months. The **attempts** to walk back a\ncommitted transition appear in it: that is in itself a piece of operational information.\n',
  'x-arthome-maturity': 'stable',
  // One call, not five. The audit log is attached to `identity` as a read model fed
  // ONLY by Kafka consumption: a single owner holds the exact total, the projection
  // by role and the sort, with no join at query time and without the BFF acquiring a
  // table of its own. The fan-out exception that used to stand here has no object any
  // more — and the system now has none at all, which is better than declaring one.
  'x-arthome-upstream': [Service.IDENTITY],
  parameters: [
    ChannelIdParameter,
    PageParameter,
    PageSizeParameter,
    {
      name: 'from',
      in: 'query',
      required: true,
      schema: dateTimeIn(),
    },
    {
      name: 'to',
      in: 'query',
      required: true,
      schema: dateTimeIn(),
    },
    {
      name: 'nature',
      in: 'query',
      schema: vocabularyIn(LIST_CHANNEL_JOURNAL_NATURE).meta({
        'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
        'x-arthome-vocabulary-reason':
          'A vocabulary local to this contract: four of the five are endpoint concerns and a vocabulary of query filters does not belong in the domain. The exception is `money`, which @arthome/core does not produce but DOES reason about — data-model.md:624 and context-map.md:402 key the redaction rule to it, so the `money` kind is absent from the response without canRevenue. Renaming that one member silently falsifies two domain documents; the other four are ours alone.',
      }),
    },
    {
      name: 'dateId',
      in: 'query',
      schema: uuidIn(),
    },
  ],
  responses: {
    200: {
      description:
        'A page of the log, **projected according to the role** — the `money` kind is absent without `canRevenue`.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              items: z.array(JournalEntrySchema),
              page: OffsetPageInfoSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:38:00.000Z',
            rightsVersion: 412,
            items: [
              {
                id: '019928e7-0000-7000-8000-000000000001',
                nature: 'event',
                occurredAt: '2026-09-21T18:04:00Z',
                actor: {
                  personId: '019928b0-0000-7000-8000-000000000001',
                  displayName: 'Claire D.',
                  surface: Surface.STUDIO_WEB,
                },
                code: 'publication.transition.applied',
                params: {
                  from: DisplayState.RESERVE,
                  to: DisplayState.SCHEDULED,
                },
                dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
              },
            ],
            page: {
              page: 1,
              pageSize: 20,
              totalItems: 812,
              totalPages: 41,
            },
          },
        },
      },
    },
    400: BadRequestResponse,
  },
});

export const createUploadTicket: Route<{
  method: 'post';
  version: 1;
  path: '/uploads';
  parameters: readonly [
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        purpose: VocabularyIn<typeof CREATE_UPLOAD_TICKET_PURPOSE>;
        contentType: VocabularyIn<typeof CREATE_UPLOAD_TICKET_CONTENT_TYPE>;
        sizeBytes: z.ZodInt;
      },
      z.core.$strip
    >
  >;
  responses: {
    201: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof UploadTicketSchema }, z.core.$loose>
      >
    >;
    400: typeof BadRequestResponse;
  };
}> = channelWrites.defineRoute({
  method: 'post',
  path: '/uploads',
  operationId: 'createUploadTicket',
  summary: 'Obtains a signed upload URL for a binary.',
  description:
    "**Never `multipart` from a WebView.** A JSON command returns a signed upload URL, valid for\n**15 minutes** — long enough for a room's 4G, short enough not to be an access token in\ndisguise.\n",
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.CATALOG],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          purpose: vocabularyIn(CREATE_UPLOAD_TICKET_PURPOSE).meta({
            'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
            'x-arthome-vocabulary-reason':
              'A vocabulary local to this contract. The domain neither produces nor consumes these values — they describe what this endpoint offers, and a new member is an endpoint change.',
          }),
          contentType: vocabularyIn(CREATE_UPLOAD_TICKET_CONTENT_TYPE).meta({
            'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
            'x-arthome-vocabulary-reason':
              'A transport or media capability, not a domain notion: the domain never chooses an ingest protocol, a container or a DRM system, and a new one appears because a device appeared.',
          }),
          sizeBytes: z.int().min(1).max(20971520),
        }),
        example: {
          purpose: PublicationChecklistItem.POSTER,
          contentType: 'image/jpeg',
          sizeBytes: 842000,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Signed upload URL.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: UploadTicketSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:45:00.000Z',
            rightsVersion: 412,
            data: {
              assetId: '019928e9-0000-7000-8000-000000000001',
              uploadUrl: 'https://uploads.arthome.fr/putt/019928e9',
              fields: {
                policy: 'eyJ...',
                signature: 'abc',
              },
              expiresAt: '2026-09-21T19:00:00Z',
            },
          },
        },
      },
    },
    400: BadRequestResponse,
  },
});

export const listChannelMerchItems: Route<{
  method: 'get';
  version: 1;
  path: '/channels/{channelId}/merch-items';
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
        z.ZodObject<{ items: z.ZodArray<typeof MerchItemAdminSchema> }, z.core.$loose>
      >
    >;
    403: typeof ForbiddenResponse;
  };
}> = channelReads.defineRoute({
  method: 'get',
  path: '/channels/{channelId}/merch-items',
  operationId: 'listChannelMerchItems',
  summary: "The channel's shop catalogue.",
  description: '**Unpaginated** — dozens of items. One external integration at a time per channel.',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.TICKETING],
  parameters: [ChannelIdParameter],
  responses: {
    200: {
      description: 'The items.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              items: z.array(MerchItemAdminSchema),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:46:00.000Z',
            rightsVersion: 412,
            items: [
              {
                id: '019928a0-7d31-7a10-b8c4-2f9e11a4d001',
                label: {
                  contentLanguage: Locale.FR,
                  text: 'T-shirt Nuit blanche',
                },
                variants: [
                  {
                    id: 'M',
                    label: 'M',
                    stock: 24,
                    price: {
                      amountMinor: 2500,
                      currencyCode: 'EUR',
                    },
                  },
                ],
                state: 'on_sale',
                source: 'arthome',
                version: 3,
              },
            ],
          },
        },
      },
    },
  },
});

export const upsertMerchItem: Route<{
  method: 'put';
  version: 1;
  path: '/channels/{channelId}/merch-items';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        itemId: z.ZodString;
        showId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        labels: z.ZodArray<
          z.ZodObject<{ contentLanguage: z.ZodString; text: z.ZodString }, z.core.$strip>
        >;
        variants: z.ZodArray<
          z.ZodObject<
            {
              id: z.ZodString;
              label: z.ZodString;
              stock: z.ZodInt;
              priceMinor: z.ZodInt;
              currencyCode: z.ZodString;
            },
            z.core.$strip
          >
        >;
        expectedVersion: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof MerchItemAdminSchema }, z.core.$loose>
      >
    >;
    409: typeof ConflictResponse;
  };
}> = channelWrites.defineRoute({
  method: 'put',
  path: '/channels/{channelId}/merch-items',
  operationId: 'upsertMerchItem',
  summary: 'Creates or updates a shop item.',
  description:
    '**An item without a variant is not sellable.** The label is **bilingual**; the absence of an\nEnglish label in the sources is a **data gap** to be filled during the port, not a translation\ngap.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.TICKETING],
  parameters: [ChannelIdParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          itemId: uuidOut(),
          showId: uuidOut().nullable().optional(),
          labels: z
            .array(
              z.object({
                contentLanguage: z.string(),
                text: z.string(),
              }),
            )
            .min(1),
          variants: z
            .array(
              z.object({
                id: z.string(),
                label: z.string(),
                stock: z.int().min(0).meta({ maximum: undefined }),
                priceMinor: z.int().min(0).meta({ maximum: undefined }),
                currencyCode: z.string().regex(new RegExp('^[A-Z]{3}$')),
              }),
            )
            .min(1),
          expectedVersion: z
            .int()
            .meta({ minimum: undefined, maximum: undefined })
            .nullable()
            .optional(),
        }),
        example: {
          itemId: '019928a0-7d31-7a10-b8c4-2f9e11a4d001',
          labels: [
            {
              contentLanguage: Locale.FR,
              text: 'T-shirt Nuit blanche',
            },
            {
              contentLanguage: Locale.EN,
              text: 'Nuit blanche tee',
            },
          ],
          variants: [
            {
              id: 'M',
              label: 'M',
              stock: 24,
              priceMinor: 2500,
              currencyCode: 'EUR',
            },
          ],
          expectedVersion: 3,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Item up to date.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: MerchItemAdminSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:47:00.000Z',
            rightsVersion: 412,
            data: {
              id: '019928a0-7d31-7a10-b8c4-2f9e11a4d001',
              label: {
                contentLanguage: Locale.FR,
                text: 'T-shirt Nuit blanche',
              },
              variants: [
                {
                  id: 'M',
                  label: 'M',
                  stock: 24,
                  price: {
                    amountMinor: 2500,
                    currencyCode: 'EUR',
                  },
                },
              ],
              state: 'on_sale',
              source: 'arthome',
              version: 4,
            },
          },
        },
      },
    },
    409: ConflictResponse,
  },
});

export const pinMerchDuringLive: Route<{
  method: 'put';
  version: 1;
  path: '/dates/{dateId}/merch-pin';
  parameters: readonly [
    typeof DateIdParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<{ itemId: z.ZodOptional<z.ZodNullable<z.ZodString>> }, z.core.$strip>
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<
                { pinnedItemId: z.ZodOptional<z.ZodNullable<z.ZodString>> },
                z.core.$loose
              >
            >;
          },
          z.core.$loose
        >
      >
    >;
    404: typeof NotFoundResponse;
  };
}> = channelWrites.defineRoute({
  method: 'put',
  path: '/dates/{dateId}/merch-pin',
  operationId: 'pinMerchDuringLive',
  summary: 'Pins an item during the live show.',
  description: '**A put**: pinning the same item twice does not pin it twice.',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.TICKETING],
  parameters: [DateIdParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          itemId: uuidOut()
            .nullable()
            .meta({
              description: '`null` removes the pin.',
            })
            .optional(),
        }),
        example: {
          itemId: '019928a0-7d31-7a10-b8c4-2f9e11a4d001',
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Pin up to date.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  pinnedItemId: uuidOut().nullable().optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:40:00.000Z',
            rightsVersion: 412,
            data: {
              pinnedItemId: '019928a0-7d31-7a10-b8c4-2f9e11a4d001',
            },
          },
        },
      },
    },
    404: NotFoundResponse,
  },
});

export const reopenReplayWindow: Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/replay-window';
  parameters: readonly [
    typeof DateIdParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  requestBody: JsonRequestBody<z.ZodObject<{ additionalHours: z.ZodInt }, z.core.$strip>>;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<
                { expiresAt: z.ZodOptional<z.ZodString>; windowHours: z.ZodOptional<z.ZodInt> },
                z.core.$loose
              >
            >;
          },
          z.core.$loose
        >
      >
    >;
    409: JsonResponse<typeof StudioErrorEnvelopeSchema>;
  };
}> = channelWrites.defineRoute({
  method: 'post',
  path: '/dates/{dateId}/replay-window',
  operationId: 'reopenReplayWindow',
  summary: 'Reopens the replay window.',
  description:
    'Possible **only** if the policy was not `none`: the promise made before the purchase does not\nreopen. The new expiry is **derived** from the end of the live show and the served window,\nnever set by hand — otherwise the replay policy would end up encoded in a storage lifecycle,\nout of reach of the tests.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.STREAMING],
  parameters: [DateIdParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          additionalHours: z.int().min(1).max(720),
        }),
        example: {
          additionalHours: 48,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Window reopened, with the new **derived** expiry.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  expiresAt: InstantOut.optional(),
                  windowHours: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-22T10:00:00.000Z',
            rightsVersion: 412,
            data: {
              expiresAt: '2026-09-26T21:30:00Z',
              windowHours: 120,
            },
          },
        },
      },
    },
    409: {
      description: '`date.replay_policy_final` when the policy was `none`.',
      content: {
        'application/json': {
          schema: StudioErrorEnvelopeSchema,
          example: {
            error: {
              code: CatalogErrorCode.REPLAY_POLICY_FINAL,
              nature: FailureNature.REFUSED,
              params: {
                currentPolicy: AudienceSanction.NONE,
              },
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-22T10:00:00.000Z',
          },
        },
      },
    },
  },
});

export const updateChannelIdentity: Route<{
  method: 'patch';
  version: 1;
  path: '/channels/{channelId}/identity';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        expectedVersion: z.ZodInt;
        publicName: z.ZodOptional<z.ZodString>;
        slug: z.ZodOptional<z.ZodString>;
        biography: z.ZodOptional<
          z.ZodArray<
            z.ZodObject<{ contentLanguage: z.ZodString; text: z.ZodString }, z.core.$strip>
          >
        >;
        categoryId: z.ZodOptional<z.ZodString>;
        avatarAssetId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          {
            version: z.ZodOptional<z.ZodInt>;
            data: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>>;
          },
          z.core.$loose
        >
      >
    >;
    403: typeof ForbiddenResponse;
    409: typeof ConflictResponse;
  };
}> = channelWrites.defineRoute({
  method: 'patch',
  path: '/channels/{channelId}/identity',
  operationId: 'updateChannelIdentity',
  summary: "Edits the channel's public face.",
  description:
    '**A pure `catalog` write.** A channel has two faces, and the contract separates them: the\nchannel **as an organisation** — members, roles, invitations, stream key — is authorisation,\nhence `identity`; the channel **as a public page** — name, biography, avatar, discipline — is\ncatalogue, hence `catalog.Artist`, in a 1:1 relation by `channelId`.\n\n**No studio command crosses the two**, and that is the proof the cut is right: the Settings\nscreen shows two blocks that never mix.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.CATALOG],
  parameters: [ChannelIdParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          expectedVersion: z.int().meta({ minimum: undefined, maximum: undefined }),
          publicName: z.string().max(120).optional(),
          slug: z.string().regex(new RegExp('^[a-z0-9-]{3,80}$')).optional(),
          biography: z
            .array(
              z.object({
                contentLanguage: z.string(),
                text: z.string().max(4000),
              }),
            )
            .optional(),
          categoryId: z.string().optional(),
          avatarAssetId: uuidOut().nullable().optional(),
        }),
        example: {
          expectedVersion: 5,
          publicName: 'Compagnie Verticale',
          categoryId: 'dance-contemporary',
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Public identity up to date.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              version: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
              data: z.looseObject({}).optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:50:00.000Z',
            rightsVersion: 412,
            version: 6,
            data: {
              publicName: 'Compagnie Verticale',
              slug: 'compagnie-verticale',
              categoryId: 'dance-contemporary',
            },
          },
        },
      },
    },
    403: ForbiddenResponse,
    409: ConflictResponse,
  },
});
