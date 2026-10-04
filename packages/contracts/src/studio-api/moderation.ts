import { z } from 'zod';

import {
  AUDIENCE_SANCTIONS,
  AudienceSanction,
  CHAT_MODES,
  ChatMode,
  DatePane,
  FailureNature,
  FILTER_SEVERITIES,
  FilterSeverity,
  Locale,
  MESSAGE_STATES,
  MessageState,
  MODERATION_BADGES,
  MODERATION_REASONS,
  MODERATION_VERDICTS,
  ModerationErrorCode,
  ModerationItemState,
  ModerationReason,
  ModerationVerdict,
  OrderState,
  PlanTier,
  StateChangeOrigin,
} from '@arthome/core';
import type { VocabularyIn, VocabularyOut } from '@arthome/core/schema';
import {
  InstantOut,
  int64,
  uuidOut,
  VOCABULARY_SOURCE_LOCAL,
  vocabularyIn,
  vocabularyOut,
  uuidIn,
} from '@arthome/core/schema';

import {
  ChannelIdParameter,
  ConflictResponse,
  CursorParameter,
  DateIdParameter,
  ForbiddenResponse,
  GoneResponse,
  IdempotencyKeyParameter,
  IfRightsVersionParameter,
  LimitParameter,
  NotFoundResponse,
  PageParameter,
  PageSizeParameter,
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  operator,
  studioV1,
} from './components.js';
import { StudioEnvelopeMetaSchema, StudioErrorEnvelopeSchema } from '../envelope/index.js';
import { cursor } from '../http/index.js';
import type {
  JsonRequestBody,
  JsonResponse,
  PathParameter,
  QueryParameter,
  Route,
  IdentifiedAccess,
} from '../http/index.js';
import { OffsetPageInfoSchema, StudioCursorPageInfoSchema } from '../pagination/index.js';
import {
  AudienceMemberSchema,
  ChatPolicySchema,
  ModerationItemSchema,
} from '../studio-desk/index.js';
import { StudioLocalizedTextSchema } from '../text/index.js';

const moderationRoutes = studioV1
  .tags(StudioTag.MODERATION)
  .headers(SurfaceParameter, IfRightsVersionParameter, TraceparentParameter);
const moderationReads = moderationRoutes.errors({ 403: ForbiddenResponse });
const moderationWrites = moderationRoutes.headers(IdempotencyKeyParameter);
const moderationDates = studioV1
  .identity(operator)
  .tags(StudioTag.MODERATION)
  .headers(SurfaceParameter, TraceparentParameter)
  .errors({ 403: ForbiddenResponse, 404: NotFoundResponse });
const date = moderationDates.resource('dates', { id: DateIdParameter });
const ModerationItemIdParameter: PathParameter<'itemId', z.ZodString> = {
  name: 'itemId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};
const moderationItems = moderationWrites.resource('moderation/items', {
  id: ModerationItemIdParameter,
});

const LIST_MODERATION_QUEUE_FILTER = ['all', 'pending', 'settled'] as const;

export const getDateChatPane: Route<{
  method: 'get';
  version: 1;
  path: '/dates/{dateId}/panes/chat';
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
                policy: z.ZodOptional<typeof ChatPolicySchema>;
                throughputPerMinute: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
                pendingModerationCount: z.ZodOptional<z.ZodInt>;
                assignedModerators: z.ZodOptional<
                  z.ZodArray<
                    z.ZodObject<
                      {
                        personId: z.ZodOptional<z.ZodString>;
                        displayName: z.ZodOptional<z.ZodString>;
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
    404: typeof NotFoundResponse;
  };
}> = date.path('panes').defineRoute({
  method: 'get',
  path: '/chat',
  operationId: 'getDateChatPane',
  summary: "A date's chat pane — the moderator's pane.",
  description:
    '**This is the pane that justified the whole mechanism**: *"a moderator must be able to load\nthe `chat` pane without loading the whole record, otherwise ticketing travels for nothing"*.\nThe argument was quoted in the contract and undone by its own implementation.\n\nOpen to `artist`, `production` and `moderation`.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [DatePane.CHAT],
  responses: {
    200: {
      description: 'Chat regime, measured rate, queue waiting.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z.looseObject({
                policy: ChatPolicySchema.optional(),
                throughputPerMinute: z
                  .int()
                  .meta({ minimum: undefined, maximum: undefined })
                  .nullable()
                  .optional(),
                pendingModerationCount: z
                  .int()
                  .meta({ minimum: undefined, maximum: undefined })
                  .optional(),
                assignedModerators: z
                  .array(
                    z.looseObject({
                      personId: uuidOut().optional(),
                      displayName: z.string().optional(),
                    }),
                  )
                  .optional(),
              }),
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:30:20.000Z',
            rightsVersion: 412,
            data: {
              policy: {
                dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
                mode: ChatMode.OPEN,
                filterSeverity: FilterSeverity.MEDIUM,
                slowModeSec: 0,
                holdersOnly: false,
                locked: true,
                version: 5,
              },
              throughputPerMinute: 41,
              pendingModerationCount: 14,
              assignedModerators: [],
            },
          },
        },
      },
    },
    404: NotFoundResponse,
  },
});

export const setDateChatPolicy: Route<{
  method: 'put';
  version: 1;
  path: '/dates/{dateId}/chat-policy';
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
        mode: z.ZodOptional<VocabularyIn<typeof CHAT_MODES>>;
        filterSeverity: z.ZodOptional<VocabularyIn<typeof FILTER_SEVERITIES>>;
        slowModeSec: z.ZodOptional<z.ZodInt>;
        holdersOnly: z.ZodOptional<z.ZodBoolean>;
        retroactiveFilter: z.ZodOptional<z.ZodBoolean>;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof ChatPolicySchema }, z.core.$loose>
      >
    >;
    409: typeof ConflictResponse;
    403: typeof ConflictResponse;
    404: typeof ConflictResponse;
  };
}> = date.single('chat-policy').replace({
  operationId: 'setDateChatPolicy',
  item: ChatPolicySchema,
  summary: "Sets the date's chat regime.",
  description:
    '**`chat` applies its own lock.** Once publication is committed, a live chat can still be\n**closed**; it can no longer be **opened wider**. `chat` knows this because it consumed the\nevent, not because it asked `catalog`.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [DatePane.CHAT],
  body: z.object({
    expectedVersion: z.int().meta({ minimum: undefined, maximum: undefined }),
    mode: vocabularyIn(CHAT_MODES)
      .meta({
        'x-arthome-vocabulary-source': 'CHAT_MODES',
      })
      .optional(),
    filterSeverity: vocabularyIn(FILTER_SEVERITIES)
      .meta({
        'x-arthome-vocabulary-source': 'FILTER_SEVERITIES',
      })
      .optional(),
    slowModeSec: z.int().min(0).max(300).optional(),
    holdersOnly: z.boolean().optional(),
    retroactiveFilter: z.boolean().optional(),
  }),
  example: {
    expectedVersion: 4,
    mode: ChatMode.EMOJI,
    slowModeSec: 10,
  },
  responses: {
    200: {
      description: 'Regime up to date.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: ChatPolicySchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:07:00.000Z',
            rightsVersion: 412,
            data: {
              dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
              mode: ChatMode.EMOJI,
              filterSeverity: FilterSeverity.MEDIUM,
              slowModeSec: 10,
              holdersOnly: false,
              locked: true,
              version: 5,
            },
          },
        },
      },
    },
    409: ConflictResponse,
  },
});

export const listModerationQueue: Route<{
  method: 'get';
  version: 1;
  path: '/channels/{channelId}/moderation/queue';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof CursorParameter,
    typeof LimitParameter,
    QueryParameter<'dateId', z.ZodString>,
    QueryParameter<'filter', z.ZodDefault<VocabularyIn<typeof LIST_MODERATION_QUEUE_FILTER>>>,
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
          {
            items: z.ZodArray<typeof ModerationItemSchema>;
            page: typeof StudioCursorPageInfoSchema;
          },
          z.core.$loose
        >
      >
    >;
    403: typeof ForbiddenResponse;
    410: typeof GoneResponse;
  };
}> = moderationReads.defineRoute({
  method: 'get',
  path: '/channels/{channelId}/moderation/queue',
  operationId: 'listModerationQueue',
  summary: 'The moderation queue — **by cursor**, the first exception to page + total.',
  description:
    "**A moderation queue grows while it is being read.** Offset pagination duplicates rows there\nand skips others — **mechanically, not exceptionally**. It is a stream, even hosted in the\nstudio, hence a cursor (D-010).\n\nThe **separate total** (`pendingCount`) feeds the badge: it is not counted over the current\npage, otherwise the bottom bar would display the number of rows loaded.\n\n**Other people's claims are visible**: `claimedBy` and `claimExpiresAt` arrive on the same\nchannel, with the name of whoever is acting. Without that, two moderators work blind to each\nother and collide on every row.\n",
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [DatePane.CHAT],
  parameters: [
    ChannelIdParameter,
    CursorParameter,
    LimitParameter,
    {
      name: 'dateId',
      in: 'query',
      schema: uuidIn(),
    },
    {
      name: 'filter',
      in: 'query',
      schema: vocabularyIn(LIST_MODERATION_QUEUE_FILTER)
        .meta({
          'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
          'x-arthome-vocabulary-reason':
            "A sort or filter key. It is a property of THIS endpoint's list — which orders it offers — not of the domain, and adding one is an endpoint change rather than a vocabulary change.",
        })
        .default(OrderState.PENDING),
    },
    {
      name: 'q',
      in: 'query',
      description: '**Server-side** search on the nickname and the text.',
      schema: z.string(),
    },
  ],
  responses: {
    200: {
      description: 'A page of the queue, plus the total for the badge.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              items: z.array(ModerationItemSchema),
              page: StudioCursorPageInfoSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:30:00.000Z',
            rightsVersion: 412,
            lastEventSeq: 8812,
            items: [
              {
                id: '019928e0-0000-7000-8000-000000000001',
                messageId: '019928f8-0000-7000-8000-000000000009',
                dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
                channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
                state: ModerationItemState.REPORTED,
                reason: ModerationReason.HARASSMENT,
                reportsCount: 3,
                atMediaSec: 1812,
                sentAt: '2026-09-21T19:29:42Z',
                authorHandle: '@anon.7742',
                authorSanction: AudienceSanction.NONE,
                body: {
                  contentLanguage: Locale.FR,
                  text: '…',
                },
                origin: StateChangeOrigin.HUMAN_VERDICT,
                version: 1,
              },
            ],
            page: {
              hasMore: true,
              nextCursor: 'eyJjIjoiMjAyNi0wOS0yMVQxOTozMCJ9',
              pendingCount: 14,
            },
          },
        },
      },
    },
    410: GoneResponse,
  },
});

export const claimModerationItem: Route<{
  method: 'post';
  version: 1;
  path: '/moderation/items/{itemId}/claim';
  parameters: readonly [
    PathParameter<'itemId', z.ZodString>,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof ModerationItemSchema }, z.core.$loose>
      >
    >;
    409: JsonResponse<typeof StudioErrorEnvelopeSchema>;
  };
}> = moderationItems.action('claim', {
  operationId: 'claimModerationItem',
  summary: 'Claims a row — a lease, not a write.',
  description:
    '**"Taking charge is not deciding."** It is a **short lease**, renewed while the person is\npresent and **released by the server** on expiry: a moderator whose phone dies does not freeze\na row for the whole live show.\n\n**Never queued offline**: replayed on reconnection, it would claim a row someone else has\nalready handled.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [DatePane.CHAT],
  responses: {
    200: {
      description: 'Lease taken, with the instant it expires.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: ModerationItemSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:30:10.000Z',
            rightsVersion: 412,
            data: {
              id: '019928e0-0000-7000-8000-000000000001',
              messageId: '019928f8-0000-7000-8000-000000000009',
              dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
              state: ModerationItemState.CLAIMED,
              reportsCount: 3,
              atMediaSec: 1812,
              claimedBy: {
                personId: '019928b0-0000-7000-8000-000000000001',
                displayName: 'Claire D.',
                surface: 'studio-mobile',
              },
              claimExpiresAt: '2026-09-21T19:32:10Z',
              version: 2,
              decisionVersion: 0,
            },
          },
        },
      },
    },
    409: {
      description: '`moderation.already_claimed`, with the name of whoever holds the lease.',
      content: {
        'application/json': {
          schema: StudioErrorEnvelopeSchema,
          example: {
            error: {
              code: ModerationErrorCode.ALREADY_CLAIMED,
              nature: FailureNature.REFUSED,
              params: {
                claimedBy: 'Yann P.',
                claimExpiresAt: '2026-09-21T19:32:00Z',
              },
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T19:30:10.000Z',
          },
        },
      },
    },
  },
});

export const releaseModerationItem: Route<{
  method: 'delete';
  version: 1;
  path: '/moderation/items/{itemId}/claim';
  parameters: readonly [
    PathParameter<'itemId', z.ZodString>,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof ModerationItemSchema }, z.core.$loose>
      >
    >;
    404: typeof NotFoundResponse;
  };
}> = moderationWrites.defineRoute({
  method: 'delete',
  path: '/moderation/items/{itemId}/claim',
  operationId: 'releaseModerationItem',
  summary: 'Releases the claim.',
  description: 'Speeds up the release; **nothing depends on it**, the lease expires by itself.',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [DatePane.CHAT],
  parameters: [
    {
      name: 'itemId',
      in: 'path',
      required: true,
      schema: uuidIn(),
    },
  ],
  responses: {
    200: {
      description: 'Row released.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: ModerationItemSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:31:00.000Z',
            rightsVersion: 412,
            data: {
              id: '019928e0-0000-7000-8000-000000000001',
              messageId: '019928f8-0000-7000-8000-000000000009',
              dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
              state: ModerationItemState.REPORTED,
              reportsCount: 3,
              atMediaSec: 1812,
              version: 3,
            },
          },
        },
      },
    },
    404: NotFoundResponse,
  },
});

export const settleModerationItem: Route<{
  method: 'post';
  version: 1;
  path: '/moderation/items/{itemId}/verdict';
  parameters: readonly [
    PathParameter<'itemId', z.ZodString>,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        verdict: VocabularyIn<typeof MODERATION_VERDICTS>;
        expectedDecisionVersion: z.ZodInt;
        reason: z.ZodOptional<VocabularyIn<typeof MODERATION_REASONS>>;
        muteUntil: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        expectedVersion: z.ZodOptional<z.ZodInt>;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof ModerationItemSchema }, z.core.$loose>
      >
    >;
    409: JsonResponse<typeof StudioErrorEnvelopeSchema>;
  };
}> = moderationItems.action('verdict', {
  operationId: 'settleModerationItem',
  summary: 'Renders a verdict — conditional, never a blind idempotent write.',
  description:
    '**The second verdict is refused, and the refusal carries the winning decision** — author\n**and** verdict — so the screen can display "X has already deleted this message" instead of a\nbare failure. A bare refusal would force a second round trip in the middle of a live show.\n\n**This is why the command is conditional** (`expectedVersion`) and **not** a blind idempotent\nwrite: an idempotent replay would overwrite the first verdict, which is exactly the opposite\nof the rule.\n\n**Two of the four verdicts bear on the person, not on the message**: `mute` and `ban` compose\nwith the channel sanction. The three axes — message state, nature of the queue row, sanction\non the person — never stack.\n\n**Queued offline**, together with sanctions on a named person, and **nothing else**: it is the\none gesture on duty that a basement 4G must be able to defer.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [DatePane.CHAT],
  body: z.object({
    verdict: vocabularyIn(MODERATION_VERDICTS).meta({
      'x-arthome-vocabulary-source': 'MODERATION_VERDICTS',
    }),
    expectedDecisionVersion: z.int().meta({ minimum: undefined, maximum: undefined }).meta({
      description:
        '**The settlement axis, not the lease axis.** A verdict is accepted as long as\nno other verdict has been rendered — including when a colleague holds the row\nclaimed. Refused only by `moderation.already_settled`, which carries the winning\nverdict and its author.\n',
    }),
    reason: vocabularyIn(MODERATION_REASONS)
      .meta({
        'x-arthome-vocabulary-source': 'MODERATION_REASONS',
      })
      .optional(),
    muteUntil: z
      .string()
      .regex(new RegExp('^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z$'))
      .nullable()
      .meta({
        format: 'date-time',
        description: '**An instant**, never a label. Absent = no limit.',
      })
      .optional(),
    expectedVersion: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
  }),
  example: {
    verdict: ModerationVerdict.MUTE,
    reason: ModerationReason.HARASSMENT,
    muteUntil: '2026-09-21T20:30:00Z',
    expectedDecisionVersion: 0,
  },
  responses: {
    200: {
      description: 'Verdict rendu.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: ModerationItemSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:31:20.000Z',
            rightsVersion: 412,
            data: {
              id: '019928e0-0000-7000-8000-000000000001',
              messageId: '019928f8-0000-7000-8000-000000000009',
              dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
              state: ModerationItemState.SETTLED,
              verdict: ModerationVerdict.MUTE,
              reportsCount: 3,
              atMediaSec: 1812,
              settledBy: {
                personId: '019928b0-0000-7000-8000-000000000001',
                displayName: 'Claire D.',
                surface: 'studio-mobile',
              },
              settledAt: '2026-09-21T19:31:20Z',
              origin: StateChangeOrigin.HUMAN_VERDICT,
              version: 3,
              decisionVersion: 1,
            },
          },
        },
      },
    },
    409: {
      description: '`moderation.already_settled`, **with the winning verdict and its author**.',
      content: {
        'application/json': {
          schema: StudioErrorEnvelopeSchema,
          example: {
            error: {
              code: ModerationErrorCode.ALREADY_SETTLED,
              nature: FailureNature.REFUSED,
              params: {
                verdict: ModerationVerdict.REMOVE,
                settledBy: 'Yann P.',
                settledAt: '2026-09-21T19:31:18Z',
              },
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T19:31:20.000Z',
          },
        },
      },
    },
  },
});

export const searchAudience: Route<{
  method: 'get';
  version: 1;
  path: '/channels/{channelId}/audience';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof PageParameter,
    typeof PageSizeParameter,
    QueryParameter<'q', z.ZodString>,
    QueryParameter<'presentOnDateId', z.ZodString>,
    QueryParameter<'sanction', VocabularyIn<typeof AUDIENCE_SANCTIONS>>,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          { items: z.ZodArray<typeof AudienceMemberSchema>; page: typeof OffsetPageInfoSchema },
          z.core.$loose
        >
      >
    >;
    403: typeof ForbiddenResponse;
  };
}> = moderationReads.defineRoute({
  method: 'get',
  path: '/channels/{channelId}/audience',
  operationId: 'searchAudience',
  summary: "A channel's audience — searchable, including those who have not written.",
  description:
    '**A collection queryable in its own right, not a projection of the chat**: the console looks\nfor "a viewer **present, who has not written**". Thousands of nicknames, hence **server-side\nsearch is mandatory**.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [DatePane.CHAT],
  parameters: [
    ChannelIdParameter,
    PageParameter,
    PageSizeParameter,
    {
      name: 'q',
      in: 'query',
      schema: z.string(),
    },
    {
      name: 'presentOnDateId',
      in: 'query',
      schema: uuidIn(),
    },
    {
      name: 'sanction',
      in: 'query',
      schema: vocabularyIn(AUDIENCE_SANCTIONS).meta({
        'x-arthome-vocabulary-source': 'AUDIENCE_SANCTIONS',
      }),
    },
  ],
  responses: {
    200: {
      description: 'A page of the audience.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              items: z.array(AudienceMemberSchema),
              page: OffsetPageInfoSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:32:00.000Z',
            rightsVersion: 412,
            items: [
              {
                id: '019928e1-0000-7000-8000-000000000001',
                handle: '@anon.7742',
                sanction: AudienceSanction.MUTED,
                sanctionExpiresAt: '2026-09-21T20:30:00Z',
                messagesCount: 0,
                firstSeenAt: '2026-02-11T20:10:00Z',
                subscriberTier: PlanTier.PASS,
                holdsSeat: true,
                present: true,
              },
            ],
            page: {
              page: 1,
              pageSize: 20,
              totalItems: 934,
              totalPages: 47,
            },
          },
        },
      },
    },
  },
});

export const sanctionAudienceMember: Route<{
  method: 'put';
  version: 1;
  path: '/channels/{channelId}/audience/{memberId}/sanction';
  parameters: readonly [
    typeof ChannelIdParameter,
    PathParameter<'memberId', z.ZodString>,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        kind: VocabularyIn<typeof AUDIENCE_SANCTIONS>;
        expiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        reason: z.ZodOptional<VocabularyIn<typeof MODERATION_REASONS>>;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof AudienceMemberSchema }, z.core.$loose>
      >
    >;
    403: typeof ForbiddenResponse;
    404: typeof NotFoundResponse;
  };
}> = moderationWrites.defineRoute({
  method: 'put',
  path: '/channels/{channelId}/audience/{memberId}/sanction',
  operationId: 'sanctionAudienceMember',
  summary: 'Sanctions a person — per channel, with an instant of expiry.',
  description:
    '**The sanction bears on the person, within a channel**: the same person is banned at one\nartist\'s and welcome at another\'s. That is why it belongs to `chat` and not to `identity` —\nhousing the sanction there would force every verdict, the most frequent gesture of a saturated\nlive show, into a cross-service write to the most sensitive service in the system.\n\n**A sanction carries an instant of expiry, never a label.** "No limit", 1 min, 10 min, 1 h and\na free-form duration are **a single field**, computed once.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [DatePane.CHAT],
  parameters: [
    ChannelIdParameter,
    {
      name: 'memberId',
      in: 'path',
      required: true,
      schema: uuidIn(),
    },
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          kind: vocabularyIn(AUDIENCE_SANCTIONS).meta({
            'x-arthome-vocabulary-source': 'AUDIENCE_SANCTIONS',
          }),
          expiresAt: z
            .string()
            .regex(new RegExp('^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z$'))
            .nullable()
            .meta({
              format: 'date-time',
            })
            .optional(),
          reason: vocabularyIn(MODERATION_REASONS)
            .meta({
              'x-arthome-vocabulary-source': 'MODERATION_REASONS',
            })
            .optional(),
        }),
        example: {
          kind: AudienceSanction.MUTED,
          expiresAt: '2026-09-21T20:30:00Z',
          reason: ModerationReason.HARASSMENT,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Sanction applied.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: AudienceMemberSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:33:00.000Z',
            rightsVersion: 412,
            data: {
              id: '019928e1-0000-7000-8000-000000000001',
              handle: '@anon.7742',
              sanction: AudienceSanction.MUTED,
              sanctionExpiresAt: '2026-09-21T20:30:00Z',
              messagesCount: 0,
              present: true,
            },
          },
        },
      },
    },
    403: ForbiddenResponse,
    404: NotFoundResponse,
  },
});

export const addBannedWord: Route<{
  method: 'post';
  version: 1;
  path: '/channels/{channelId}/moderation/banned-words';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      { word: z.ZodString; retroactive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>> },
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
              z.ZodObject<
                {
                  word: z.ZodOptional<z.ZodString>;
                  reprocessing: z.ZodOptional<z.ZodBoolean>;
                  estimatedAffectedMessages: z.ZodOptional<z.ZodInt>;
                },
                z.core.$loose
              >
            >;
          },
          z.core.$loose
        >
      >
    >;
    403: typeof ForbiddenResponse;
  };
}> = moderationWrites.defineRoute({
  method: 'post',
  path: '/channels/{channelId}/moderation/banned-words',
  operationId: 'addBannedWord',
  summary: 'Adds a word to the dictionary — the reclassification is asynchronous.',
  description:
    '**The ambiguity is settled: retroactive processing is asynchronous.** The command answers\n**immediately** with `reprocessing: true` and the **estimated** number of messages affected;\nthe new queue items arrive over the real-time channel, marked `origin: retroactive_filter` so\nthe log can tell them apart from a human decision.\n\nReason: a synchronous reclassification over thousands of messages **would block the command in\nthe middle of a live show**.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [DatePane.CHAT],
  parameters: [ChannelIdParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          word: z.string().min(1).max(60),
          retroactive: z.boolean().default(false).optional(),
        }),
        example: {
          word: 'exemple',
          retroactive: true,
        },
      },
    },
  },
  responses: {
    202: {
      description: 'Word added; the reclassification runs in the background.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  word: z.string().optional(),
                  reprocessing: z.boolean().optional(),
                  estimatedAffectedMessages: z
                    .int()
                    .meta({ minimum: undefined, maximum: undefined })
                    .optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:34:00.000Z',
            rightsVersion: 412,
            data: {
              word: 'exemple',
              reprocessing: true,
              estimatedAffectedMessages: 312,
            },
          },
        },
      },
    },
    403: ForbiddenResponse,
  },
});

export const removeBannedWord: Route<{
  method: 'delete';
  version: 1;
  path: '/channels/{channelId}/moderation/banned-words/{word}';
  parameters: readonly [
    typeof ChannelIdParameter,
    PathParameter<'word', z.ZodString>,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
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
  };
}> = moderationWrites.defineRoute({
  method: 'delete',
  path: '/channels/{channelId}/moderation/banned-words/{word}',
  operationId: 'removeBannedWord',
  summary: 'Removes a word from the dictionary.',
  description:
    'Removal **does not republish** messages already removed: a moderation decision stays a fact.',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [DatePane.CHAT],
  parameters: [
    ChannelIdParameter,
    {
      name: 'word',
      in: 'path',
      required: true,
      schema: z.string(),
    },
  ],
  responses: {
    200: {
      description: 'Word removed.',
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
            servedAt: '2026-09-21T19:35:00.000Z',
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

export const listStudioChatMessages: Route<{
  method: 'get';
  version: 1;
  path: '/dates/{dateId}/chat/messages';
  parameters: readonly [
    typeof DateIdParameter,
    typeof CursorParameter,
    typeof LimitParameter,
    {
      readonly name: 'sinceSeq';
      readonly in: 'query';
      readonly description: 'Resume by sequence number after a channel break.';
      readonly schema: z.ZodNumber;
    },
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
            items: z.ZodArray<
              z.ZodObject<
                {
                  id: z.ZodString;
                  seq: z.ZodNumber;
                  authorHandle: z.ZodString;
                  atMediaSec: z.ZodInt;
                  sentAt: z.ZodString;
                  state: VocabularyOut;
                  badge: VocabularyOut;
                  body: typeof StudioLocalizedTextSchema;
                },
                z.core.$loose
              >
            >;
            page: typeof StudioCursorPageInfoSchema;
          },
          z.core.$loose
        >
      >
    >;
    403: typeof ForbiddenResponse;
    410: typeof GoneResponse;
    404: typeof ConflictResponse;
  };
}> = date.path('chat').defineRoute({
  method: 'get',
  path: '/messages',
  operationId: 'listStudioChatMessages',
  paging: cursor({ maxLimit: 50 }),
  summary:
    'The live chat as the studio sees it — **by cursor**, the second exception to page + total.',
  description:
    "**The studio sees both states of a message, the viewer sees one.** A removed message never\nreaches a public surface; here it is served with its state, because that is what moderation\narbitrates.\n\nCursor, never page + total: counting a live show's messages in order to display a total is a\npointless cost, and the total changes between the call and the display.\n",
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [DatePane.CHAT],
  parameters: [
    CursorParameter,
    LimitParameter,
    {
      name: 'sinceSeq',
      in: 'query',
      description: 'Resume by sequence number after a channel break.',
      schema: int64(),
    },
  ],
  responses: {
    200: {
      description: 'A page of messages, with their state and their badge.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              items: z.array(
                z.looseObject({
                  id: uuidOut(),
                  seq: int64(),
                  authorHandle: z.string(),
                  atMediaSec: z.int().meta({ minimum: undefined, maximum: undefined }),
                  sentAt: InstantOut,
                  state: vocabularyOut(MESSAGE_STATES),
                  badge: vocabularyOut(MODERATION_BADGES).meta({
                    description:
                      '**Derived** by `moderationBadgeOf` and served. Precedence: banned > silenced > removed > published.',
                  }),
                  body: StudioLocalizedTextSchema,
                }),
              ),
              page: StudioCursorPageInfoSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:36:00.000Z',
            rightsVersion: 412,
            lastEventSeq: 41287,
            items: [
              {
                id: '019928f8-0000-7000-8000-000000000009',
                seq: 41280,
                authorHandle: '@anon.7742',
                atMediaSec: 1812,
                sentAt: '2026-09-21T19:29:42Z',
                state: MessageState.REMOVED,
                badge: AudienceSanction.MUTED,
                body: {
                  contentLanguage: Locale.FR,
                  text: '…',
                },
              },
            ],
            page: {
              hasMore: true,
              nextCursor: null,
              pendingCount: 14,
            },
          },
        },
      },
    },
    410: GoneResponse,
  },
});
