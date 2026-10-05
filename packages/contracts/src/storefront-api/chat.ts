import { z } from 'zod';

import { DatePane, MODERATION_REASONS, ModerationReason } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { vocabularyIn, uuidIn } from '@arthome/core/schema';

import {
  CsrfRefusedResponse,
  IdempotencyKeyParameter,
  NotFoundResponse,
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  storefrontV1,
} from './components.js';
import { StorefrontEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, Route } from '../http/index.js';

const chatRoutes = storefrontV1
  .tags(StorefrontTag.CHAT)
  .headers(SurfaceParameter, TraceparentParameter);
const chatWrites = chatRoutes.security(
  {
    sessionCookie: [],
    csrfToken: [],
  },
  {
    bearerToken: [],
  },
);

export const reportChatMessage: Route<{
  method: 'post';
  version: 1;
  path: '/chat/messages/{messageId}/report';
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
}> = chatWrites.defineRoute({
  method: 'post',
  path: '/chat/messages/{messageId}/report',
  operationId: 'reportChatMessage',
  summary: 'Reports a message to moderation.',
  description:
    'A report creates a **queue row** (`reported`), not a sanction. The three axes never stack.',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [DatePane.CHAT],
  parameters: [
    {
      name: 'messageId',
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
