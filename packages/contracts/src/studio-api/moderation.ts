import { z } from 'zod';

import {
  AUDIENCE_SANCTIONS,
  AudienceSanction,
  DatePane,
  Locale,
  MODERATION_REASONS,
  ModerationItemState,
  ModerationReason,
  OrderState,
  PlanTier,
  StateChangeOrigin,
} from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { VOCABULARY_SOURCE_LOCAL, vocabularyIn, uuidIn } from '@arthome/core/schema';

import {
  ChannelIdParameter,
  CursorParameter,
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
  studioV1,
} from './components.js';
import { StudioEnvelopeMetaSchema } from '../envelope/index.js';
import type {
  JsonRequestBody,
  JsonResponse,
  PathParameter,
  QueryParameter,
  Route,
} from '../http/index.js';
import { OffsetPageInfoSchema, StudioCursorPageInfoSchema } from '../pagination/index.js';
import { AudienceMemberSchema, ModerationItemSchema } from '../studio-desk/index.js';

const moderationRoutes = studioV1
  .tags(StudioTag.MODERATION)
  .headers(SurfaceParameter, IfRightsVersionParameter, TraceparentParameter);
const moderationReads = moderationRoutes.errors({ 403: ForbiddenResponse });
const moderationWrites = moderationRoutes.headers(IdempotencyKeyParameter);

const LIST_MODERATION_QUEUE_FILTER = ['all', 'pending', 'settled'] as const;

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
  method: 'post';
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
  method: 'post',
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
