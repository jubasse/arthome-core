import { z } from 'zod';

import {
  ChatErrorCode,
  DatePane,
  FailureNature,
  Locale,
  MessageState,
  MODERATION_REASONS,
  ModerationReason,
} from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { int64, uuidOut, VOCABULARY_SOURCE_LOCAL, vocabularyIn } from '@arthome/core/schema';

import {
  CsrfRefusedResponse,
  CursorParameter,
  DateIdParameter,
  GoneResponse,
  IdempotencyKeyParameter,
  LimitParameter,
  NotFoundResponse,
  StorefrontTag,
  SurfaceParameter,
  TooManyRequestsResponse,
  TraceparentParameter,
} from './components.js';
import { ChatMessageSchema, ReactionQuotaSchema } from '../engagement/index.js';
import { StorefrontEnvelopeMetaSchema, StorefrontErrorEnvelopeSchema } from '../envelope/index.js';
import type {
  JsonRequestBody,
  JsonResponse,
  PathParameter,
  QueryParameter,
  Route,
} from '../http/index.js';
import { defineRoute } from '../http/index.js';
import { StorefrontCursorPageInfoSchema } from '../pagination/index.js';

const SEND_REACTION_REACTION_ID = ['applause', 'heart', 'bravo', 'laugh', 'wow', 'sad'] as const;

export const listChatMessages: Route<{
  method: 'get';
  path: '/v1/dates/{dateId}/chat/messages';
  parameters: readonly [
    typeof DateIdParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof CursorParameter,
    typeof LimitParameter,
    QueryParameter<'sinceSeq', z.ZodNumber>,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            items: z.ZodArray<typeof ChatMessageSchema>;
            page: typeof StorefrontCursorPageInfoSchema;
          },
          z.core.$loose
        >
      >
    >;
    404: typeof NotFoundResponse;
    410: typeof GoneResponse;
  };
}> = defineRoute({
  method: 'get',
  path: '/v1/dates/{dateId}/chat/messages',
  operationId: 'listChatMessages',
  tags: [StorefrontTag.CHAT],
  summary: "The chat's sliding window, by cursor.",
  description:
    '**No backward pagination on a live chat**: nobody scrolls back through a chat with a remote\ncontrol, and on all three surfaces it is a sliding window. The full history is read on the\n**replay**, replayed by `atMediaSec`.\n\nCatch-up on entry is **served per surface**: 20 messages on television, 50 elsewhere. **No\nremoved message ever reaches a public surface** — moderation is a state on the `chat` side,\nand the stream served is already filtered.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [DatePane.CHAT],
  parameters: [
    DateIdParameter,
    SurfaceParameter,
    TraceparentParameter,
    CursorParameter,
    LimitParameter,
    {
      name: 'sinceSeq',
      in: 'query',
      description: 'Resume by sequence number, after a channel break.',
      schema: int64(),
    },
  ],
  responses: {
    200: {
      description: 'Messages.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              items: z.array(ChatMessageSchema),
              page: StorefrontCursorPageInfoSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:36:00.000Z',
            lastEventSeq: 41287,
            items: [
              {
                id: '019928f8-0000-7000-8000-000000000001',
                dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
                seq: 41287,
                authorHandle: '@marie.j',
                atMediaSec: 2160,
                sentAt: '2026-09-21T19:35:58Z',
                badge: MessageState.PUBLISHED,
                body: {
                  contentLanguage: Locale.FR,
                  text: 'Quelle lumière.',
                },
              },
            ],
            page: {
              hasMore: true,
              nextCursor: null,
              prevCursor: null,
            },
          },
        },
      },
    },
    404: NotFoundResponse,
    410: GoneResponse,
  },
});

export const sendChatMessage: Route<{
  method: 'post';
  path: '/v1/dates/{dateId}/chat/messages';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<{ text: z.ZodString; atMediaSec: z.ZodInt }, z.core.$strip>
  >;
  responses: {
    201: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof ChatMessageSchema }, z.core.$loose>
      >
    >;
    403: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
    429: typeof TooManyRequestsResponse;
  };
}> = defineRoute({
  method: 'post',
  path: '/v1/dates/{dateId}/chat/messages',
  operationId: 'sendChatMessage',
  tags: [StorefrontTag.CHAT],
  summary: 'Posts a chat message.',
  description:
    '**Never queued offline**: a message replayed ten minutes later no longer means anything. It\nis **dropped**, not queued.\n\nThe position in the media (`atMediaSec`) is **provided by the client**, because only the\nclient knows where its playback has reached; the absolute instant is set by the server. Both\ntravel, never one alone.\n\nThe **rate limit is in the contract**, not merely enforced: `chat.rate_limited` carries\n`retryAfterMs`, so the surface can **disable the input cleanly** instead of stacking up\nrefusals.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [DatePane.CHAT],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [DateIdParameter, IdempotencyKeyParameter, SurfaceParameter, TraceparentParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          text: z.string().min(1).max(500),
          atMediaSec: z.int().min(0).meta({ maximum: undefined }),
        }),
        example: {
          text: 'Quelle lumière.',
          atMediaSec: 2160,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Message posted.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: ChatMessageSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:36:02.000Z',
            data: {
              id: '019928f8-0000-7000-8000-000000000002',
              dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
              seq: 41288,
              authorHandle: '@marie.j',
              atMediaSec: 2160,
              sentAt: '2026-09-21T19:36:02Z',
              badge: MessageState.PUBLISHED,
              body: {
                contentLanguage: Locale.FR,
                text: 'Quelle lumière.',
              },
            },
          },
        },
      },
    },
    403: {
      description:
        "Chat mode closed, holders only, or the person is sanctioned in this channel.\n\nAlso `api.forbidden` when a write with the session cookie lacks its `X-Arthome-Csrf` token, or carries another session's (`CsrfRefused`).\n",
      content: {
        'application/json': {
          schema: StorefrontErrorEnvelopeSchema,
          example: {
            error: {
              code: ChatErrorCode.HOLDERS_ONLY,
              nature: FailureNature.REFUSED,
              params: {},
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T19:36:02.000Z',
          },
        },
      },
    },
    429: TooManyRequestsResponse,
  },
});

export const sendReaction: Route<{
  method: 'post';
  path: '/v1/dates/{dateId}/chat/reactions';
  parameters: readonly [
    typeof DateIdParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      { reactionId: VocabularyIn<typeof SEND_REACTION_REACTION_ID>; atMediaSec: z.ZodInt },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof ReactionQuotaSchema }, z.core.$loose>
      >
    >;
    429: typeof TooManyRequestsResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = defineRoute({
  method: 'post',
  path: '/v1/dates/{dateId}/chat/reactions',
  operationId: 'sendReaction',
  tags: [StorefrontTag.CHAT],
  summary: 'Sends a reaction, and returns the remaining quota.',
  description:
    '**The quota travels with the response** — how many are left, when it recharges — so that the\nsurface can **disable** the control rather than let it fail. An inert action is forbidden by\nthe brief; an action that fails silently is worse. **One reaction in flight at a time.**\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [DatePane.CHAT],
  'x-arthome-idempotency-exemption':
    '**The quota already bounds the effect**, and it is served with the response. A replayed key\nwould return a **stale** quota — "17 left" when 12 are left — which is worse than no response\nat all: the surface disables its control on that number.\n',
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [DateIdParameter, SurfaceParameter, TraceparentParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          reactionId: vocabularyIn(SEND_REACTION_REACTION_ID).meta({
            'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
            'x-arthome-vocabulary-reason':
              'A vocabulary local to this contract. The domain neither produces nor consumes these values — they describe what this endpoint offers, and a new member is an endpoint change.',
          }),
          atMediaSec: z.int().min(0).meta({ maximum: undefined }),
        }),
        example: {
          reactionId: 'applause',
          atMediaSec: 2165,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Reaction accepted, remaining quota.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: ReactionQuotaSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:36:05.000Z',
            data: {
              remaining: 17,
              rechargesAt: '2026-09-21T19:41:05Z',
            },
          },
        },
      },
    },
    429: TooManyRequestsResponse,
    403: CsrfRefusedResponse,
  },
});

export const reportChatMessage: Route<{
  method: 'post';
  path: '/v1/chat/messages/{messageId}/report';
  parameters: readonly [
    PathParameter<'messageId', z.ZodString>,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<{ reason: VocabularyIn<typeof MODERATION_REASONS> }, z.core.$strip>
  >;
  responses: {
    202: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<{ reported: z.ZodOptional<z.ZodBoolean> }, z.core.$loose>
            >;
          },
          z.core.$loose
        >
      >
    >;
    404: typeof NotFoundResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = defineRoute({
  method: 'post',
  path: '/v1/chat/messages/{messageId}/report',
  operationId: 'reportChatMessage',
  tags: [StorefrontTag.CHAT],
  summary: 'Reports a message to moderation.',
  description:
    'A report creates a **queue row** (`reported`), not a sanction. The three axes never stack.',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [DatePane.CHAT],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [
    {
      name: 'messageId',
      in: 'path',
      required: true,
      schema: uuidOut(),
    },
    IdempotencyKeyParameter,
    SurfaceParameter,
    TraceparentParameter,
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          reason: vocabularyIn(MODERATION_REASONS).meta({
            'x-arthome-vocabulary-source': 'MODERATION_REASONS',
            description:
              '**The vocabulary from `shared/`, which is authoritative and had no competitor.** `spoiler` —\n"gives away the show" — is the only reason specific to live performance and it is translated\nin the i18n catalogue; it had disappeared, as had `insult`. `hate` and `filter` had been\ninvented, and `filter` is not a reason but an **origin** — the contract already carries it\ncorrectly elsewhere, and putting it in `reason` as well gave one field two axes.\n',
          }),
        }),
        example: {
          reason: ModerationReason.HARASSMENT,
        },
      },
    },
  },
  responses: {
    202: {
      description:
        'Report recorded. A second report from the same account does not create another.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  reported: z.boolean().optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:37:00.000Z',
            data: {
              reported: true,
            },
          },
        },
      },
    },
    404: NotFoundResponse,
    403: CsrfRefusedResponse,
  },
});
