import { z } from 'zod';

import { CrewRole, DatePane, NavigationEntry, Service } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { VOCABULARY_SOURCE_LOCAL, vocabularyIn, uuidIn } from '@arthome/core/schema';

import {
  ConflictResponse,
  IdempotencyKeyParameter,
  IfRightsVersionParameter,
  NotFoundResponse,
  RightsVersionHeader,
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  studioV1,
} from './components.js';
import { StudioEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, Route } from '../http/index.js';
import { EffectiveRightsSchema } from '../studio-access/index.js';

const crewRoutes = studioV1
  .tags(StudioTag.CREW)
  .headers(SurfaceParameter, IfRightsVersionParameter, TraceparentParameter);

const crewWrites = crewRoutes.headers(IdempotencyKeyParameter);
const InvitationIdParameter: PathParameter<'invitationId', z.ZodString> = {
  name: 'invitationId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};
const invitations = crewWrites.resource('invitations', { id: InvitationIdParameter });

const RESPOND_TO_INVITATION_DECISION = ['accept', 'decline'] as const;

export const respondToInvitation: Route<{
  method: 'post';
  version: 1;
  path: '/invitations/{invitationId}/response';
  parameters: readonly [
    PathParameter<'invitationId', z.ZodString>,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<{ decision: VocabularyIn<typeof RESPOND_TO_INVITATION_DECISION> }, z.core.$strip>
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof EffectiveRightsSchema }, z.core.$loose>
      >
    >;
    404: typeof NotFoundResponse;
    409: typeof ConflictResponse;
  };
}> = invitations.action('response', {
  operationId: 'respondToInvitation',
  summary: 'Accepts or declines an invitation.',
  description:
    "Acceptance publishes the membership **then** an increment of `rightsVersion` — that is what\nbrings the channel into the switcher **without a reload**, and what makes a lost channel's\nreal-time rooms be left without waiting for a reconnection.\n",
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  body: z.object({
    decision: vocabularyIn(RESPOND_TO_INVITATION_DECISION).meta({
      'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
      'x-arthome-vocabulary-reason':
        "The two answers this one command accepts. It is the command's shape, not a vocabulary: a third answer would be a third command.",
    }),
  }),
  example: {
    decision: 'accept',
  },
  responses: {
    200: {
      description: 'Answer recorded, with the new rights version.',
      headers: {
        'X-Arthome-Rights-Version': RightsVersionHeader,
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: EffectiveRightsSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:17:00.000Z',
            rightsVersion: 413,
            data: {
              channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
              channelName: 'Compagnie Verticale',
              roles: [CrewRole.VIDEO],
              isOwner: false,
              navigation: [
                NavigationEntry.EVENTS,
                NavigationEntry.STREAM,
                NavigationEntry.REPLAYS,
                NavigationEntry.HELP,
              ],
              datePanes: [DatePane.TECH],
              canRevenue: false,
              canOps: false,
              canTech: true,
              canDecideOutcome: false,
              assignableRoles: [],
            },
          },
        },
      },
    },
    404: NotFoundResponse,
    409: ConflictResponse,
  },
});

export const revokeDateAccess: Route<{
  method: 'delete';
  version: 1;
  path: '/date-access-grants/{grantId}';
  parameters: readonly [
    PathParameter<'grantId', z.ZodString>,
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
              z.ZodObject<{ revoked: z.ZodOptional<z.ZodBoolean> }, z.core.$loose>
            >;
          },
          z.core.$loose
        >
      >
    >;
    404: typeof NotFoundResponse;
  };
}> = crewWrites.defineRoute({
  method: 'delete',
  path: '/date-access-grants/{grantId}',
  operationId: 'revokeDateAccess',
  summary: 'Revokes a one-off access, without touching membership.',
  description:
    "The server makes the client **leave this date's real-time rooms** without waiting for a\nreconnection: that is what stops someone whose access expired at curtain-down from carrying on\nwatching a queue.\n",
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  parameters: [
    {
      name: 'grantId',
      in: 'path',
      required: true,
      schema: uuidIn(),
    },
  ],
  responses: {
    200: {
      description: 'Access revoked.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  revoked: z.boolean().optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T21:46:00.000Z',
            rightsVersion: 413,
            data: {
              revoked: true,
            },
          },
        },
      },
    },
    404: NotFoundResponse,
  },
});
