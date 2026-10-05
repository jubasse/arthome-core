import { z } from 'zod';

import { CrewRole, RunState, Service } from '@arthome/core';
import { dateTimeIn } from '@arthome/core/schema';

import {
  IfRightsVersionParameter,
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  UnauthorizedResponse,
  studioV1,
} from './components.js';
import { StudioEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonResponse, QueryParameter, Route } from '../http/index.js';
import { DutySchema } from '../studio-access/index.js';

const agendaRoutes = studioV1
  .tags(StudioTag.AGENDA)
  .headers(SurfaceParameter, IfRightsVersionParameter, TraceparentParameter);

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
      schema: dateTimeIn(),
    },
    {
      name: 'to',
      in: 'query',
      required: true,
      schema: dateTimeIn(),
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
