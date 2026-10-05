import { z } from 'zod';

import { MemberRole, Service } from '@arthome/core';
import { InstantOut, uuidIn } from '@arthome/core/schema';

import {
  IdempotencyKeyParameter,
  IfRightsVersionParameter,
  NotFoundResponse,
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  studioV1,
} from './components.js';
import { StudioEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, Route } from '../http/index.js';

const runRoutes = studioV1
  .tags(StudioTag.RUN)
  .headers(SurfaceParameter, IfRightsVersionParameter, TraceparentParameter);

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
