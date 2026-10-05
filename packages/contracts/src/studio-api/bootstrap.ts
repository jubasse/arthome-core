import { z } from 'zod';

import { Upstream } from '@arthome/core';
import type { VocabularyOut } from '@arthome/core/schema';
import { vocabularyOutLocal, uuidIn, dateTimeIn } from '@arthome/core/schema';

import {
  BadRequestResponse,
  IfRightsVersionParameter,
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  UnauthorizedResponse,
  studioV1,
} from './components.js';
import { StudioEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonResponse, QueryParameter, Route } from '../http/index.js';

const bootstrapRoutes = studioV1
  .tags(StudioTag.BOOTSTRAP)
  .headers(SurfaceParameter, TraceparentParameter);
const bootstrapReads = bootstrapRoutes
  .headers(IfRightsVersionParameter)
  .errors({ 401: UnauthorizedResponse });

const LIST_STUDIO_CHANGES_INVALIDATED = [
  'date:{id}',
  'date:{id}:publication',
  'date:{id}:tickets',
  'date:{id}:run',
  'date:{id}:crew',
  'channel:{id}:members',
  'channel:{id}:payouts',
  'channel:{id}:moderation',
  'channel:{id}:settings',
  'person:duties',
  'person:inbox',
  'person:rights',
] as const;

export const listStudioChanges: Route<{
  method: 'get';
  version: 1;
  path: '/changes';
  parameters: readonly [
    QueryParameter<'since', z.ZodString, true>,
    QueryParameter<'channelId', z.ZodString>,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          { invalidated: z.ZodArray<VocabularyOut>; complete: z.ZodBoolean },
          z.core.$loose
        >
      >
    >;
    400: typeof BadRequestResponse;
    401: typeof UnauthorizedResponse;
  };
}> = bootstrapReads.defineRoute({
  method: 'get',
  path: '/changes',
  operationId: 'listStudioChanges',
  summary: 'The invalidations since a given instant — not the data.',
  description:
    'The mechanism was **written, argued, specified** — and wired to the storefront BFF only. The\nstudio has the same need, on the surface one leaves open for two hours while a colleague edits\nthe same objects.\n\nAnd it has a reason that exists nowhere else: under Ionic\'s router, **a page stays in the DOM\nafter you leave it** and redisplays as-is on the way back. Without a cheap freshness read,\nevery return to a page is either a stale display or a full reload over a room\'s 4G.\n\n`complete: false` means "too many changes, reload everything" — the same honesty as\n`resume:too_old` on the channel.\n',
  'x-arthome-maturity': 'stable',
  // Like its storefront twin: a read of the real-time gateway's Redis resume buffer,
  // not a query against the six services.
  'x-arthome-upstream': [Upstream.REALTIME],
  parameters: [
    {
      name: 'since',
      in: 'query',
      required: true,
      schema: dateTimeIn(),
    },
    {
      name: 'channelId',
      in: 'query',
      description:
        'Restricted to one channel. Absent, the response covers **all** accessible channels.',
      schema: uuidIn(),
    },
  ],
  responses: {
    200: {
      description: 'A list of invalidated tags.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              invalidated: z
                .array(
                  vocabularyOutLocal(
                    LIST_STUDIO_CHANGES_INVALIDATED,
                    'Cache tags, not a domain vocabulary. They name what a surface must revalidate, and the domain has no notion of them: @arthome/core knows a date, not `date:{id}`.',
                  ),
                )
                .meta({
                  description: 'Tags **named by the contract**, never invented by a surface.\n',
                }),
              complete: z.boolean(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:45:00.000Z',
            rightsVersion: 412,
            invalidated: ['date:019928a0-7d31-7a10-b8c4-2f9e11a4c001:publication', 'person:inbox'],
            complete: true,
          },
        },
      },
    },
    400: BadRequestResponse,
  },
});
