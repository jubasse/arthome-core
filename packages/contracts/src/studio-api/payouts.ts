import { z } from 'zod';

import { ChannelErrorCode, FailureNature, NavigationEntry, Surface } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { VOCABULARY_SOURCE_LOCAL, vocabularyIn, uuidIn } from '@arthome/core/schema';

import {
  GoneResponse,
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
import { BankChangeRequestSchema, ExportJobSchema } from '../studio-money/index.js';

const payoutsRoutes = studioV1
  .tags(StudioTag.PAYOUTS)
  .headers(SurfaceParameter, IfRightsVersionParameter, TraceparentParameter);
const payoutsWrites = payoutsRoutes.headers(IdempotencyKeyParameter);

const COUNTERSIGN_BANK_CHANGE_DECISION = ['countersign', 'reject'] as const;

export const countersignBankChange: Route<{
  method: 'post';
  version: 1;
  path: '/bank-change-requests/{requestId}/countersign';
  parameters: readonly [
    PathParameter<'requestId', z.ZodString>,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      { decision: VocabularyIn<typeof COUNTERSIGN_BANK_CHANGE_DECISION>; reauthToken: z.ZodString },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof BankChangeRequestSchema }, z.core.$loose>
      >
    >;
    403: JsonResponse<typeof StudioErrorEnvelopeSchema>;
    410: typeof GoneResponse;
  };
}> = payoutsWrites.defineRoute({
  method: 'post',
  path: '/bank-change-requests/{requestId}/countersign',
  operationId: 'countersignBankChange',
  summary: 'Counter-signs a change of bank details.',
  description:
    '**Two distinct roles**: the owner **and** the treasury. One and the same person cannot sign\nboth times, even holding both roles — `channel.same_actor_forbidden`. That is the entire point of a\ndual signature.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [NavigationEntry.PAYOUTS],
  parameters: [
    {
      name: 'requestId',
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
          decision: vocabularyIn(COUNTERSIGN_BANK_CHANGE_DECISION).meta({
            'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
            'x-arthome-vocabulary-reason':
              "The two answers this one command accepts. It is the command's shape, not a vocabulary: a third answer would be a third command.",
          }),
          reauthToken: z.string(),
        }),
        example: {
          decision: 'countersign',
          reauthToken: 'ott_4d77e2',
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Counter-signed, transfers resumed.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: BankChangeRequestSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:30:00.000Z',
            rightsVersion: 412,
            data: {
              requestId: '019928e6-0000-7000-8000-000000000001',
              state: 'countersigned',
              maskedAccountTail: '4417',
              requestedAt: '2026-09-21T18:26:00Z',
              expiresAt: '2026-09-28T18:26:00Z',
              countersignedBy: {
                personId: '019928b4-0000-7000-8000-000000000001',
                displayName: 'Léa M.',
                surface: Surface.STUDIO_WEB,
              },
            },
          },
        },
      },
    },
    403: {
      description: '`channel.same_actor_forbidden` — a dual signature requires two people.',
      content: {
        'application/json': {
          schema: StudioErrorEnvelopeSchema,
          example: {
            error: {
              code: ChannelErrorCode.SAME_ACTOR_FORBIDDEN,
              nature: FailureNature.REFUSED,
              params: {},
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T18:30:00.000Z',
          },
        },
      },
    },
    410: GoneResponse,
  },
});

export const getChannelExport: Route<{
  method: 'get';
  version: 1;
  path: '/exports/{exportId}';
  parameters: readonly [
    PathParameter<'exportId', z.ZodString>,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof ExportJobSchema }, z.core.$loose>
      >
    >;
    404: typeof NotFoundResponse;
  };
}> = payoutsRoutes.defineRoute({
  method: 'get',
  path: '/exports/{exportId}',
  operationId: 'getChannelExport',
  summary: "An export's state, and its signed URL once it is ready.",
  description:
    'Until it is `ready`, `downloadUrl` is null: the contract never serves an address that would not answer.',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [NavigationEntry.PAYOUTS],
  parameters: [
    {
      name: 'exportId',
      in: 'path',
      required: true,
      schema: uuidIn(),
    },
  ],
  responses: {
    200: {
      description: "The export's state.",
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: ExportJobSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:44:00.000Z',
            rightsVersion: 412,
            data: {
              exportId: '019928e8-0000-7000-8000-000000000001',
              kind: 'fec',
              state: 'ready',
              requestedAt: '2026-09-21T18:39:00Z',
              downloadUrl: 'https://files.arthome.fr/exports/019928e8?sig=abc',
              downloadExpiresAt: '2026-09-21T19:44:00Z',
            },
          },
        },
      },
    },
    404: NotFoundResponse,
  },
});
