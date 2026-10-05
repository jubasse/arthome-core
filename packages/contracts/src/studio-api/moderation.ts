import { z } from 'zod';

import {
  DatePane,
  FailureNature,
  MODERATION_REASONS,
  MODERATION_VERDICTS,
  ModerationErrorCode,
  ModerationItemState,
  ModerationReason,
  ModerationVerdict,
  StateChangeOrigin,
} from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { vocabularyIn, uuidIn } from '@arthome/core/schema';

import {
  IdempotencyKeyParameter,
  IfRightsVersionParameter,
  NotFoundResponse,
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  studioV1,
} from './components.js';
import { StudioEnvelopeMetaSchema, StudioErrorEnvelopeSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, Route } from '../http/index.js';
import { ModerationItemSchema } from '../studio-desk/index.js';

const moderationRoutes = studioV1
  .tags(StudioTag.MODERATION)
  .headers(SurfaceParameter, IfRightsVersionParameter, TraceparentParameter);

const moderationWrites = moderationRoutes.headers(IdempotencyKeyParameter);
const ModerationItemIdParameter: PathParameter<'itemId', z.ZodString> = {
  name: 'itemId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};
const moderationItems = moderationWrites.resource('moderation/items', {
  id: ModerationItemIdParameter,
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
