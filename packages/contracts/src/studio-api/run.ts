import { z } from 'zod';

import { Service } from '@arthome/core';
import type { VocabularyOut } from '@arthome/core/schema';
import { InstantOut, uuidOut, vocabularyOutLocal } from '@arthome/core/schema';

import {
  ChannelIdParameter,
  ForbiddenResponse,
  IfRightsVersionParameter,
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  studioV1,
} from './components.js';
import { StudioEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonResponse, Route } from '../http/index.js';

const runRoutes = studioV1
  .tags(StudioTag.RUN)
  .headers(SurfaceParameter, IfRightsVersionParameter, TraceparentParameter);
const runReads = runRoutes.errors({ 403: ForbiddenResponse });
const GET_DATE_TECH_PANE_INGEST_PROTOCOL = ['rtmps', 'srt', 'whip'] as const;

export const getChannelStreamSettings: Route<{
  method: 'get';
  version: 1;
  path: '/channels/{channelId}/stream';
  parameters: readonly [
    typeof ChannelIdParameter,
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
            data: z.ZodObject<
              {
                ingestUrl: z.ZodOptional<z.ZodString>;
                recommendedProtocol: z.ZodOptional<VocabularyOut>;
                recommendedBitrateKbps: z.ZodOptional<z.ZodInt>;
                lastMeasuredUpKbps: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
                defaults: z.ZodOptional<
                  z.ZodObject<
                    {
                      ingestProtocol: z.ZodOptional<VocabularyOut>;
                      qualityLadder: z.ZodOptional<z.ZodArray<z.ZodString>>;
                      holdScreenAutoAfterSec: z.ZodOptional<z.ZodInt>;
                    },
                    z.core.$loose
                  >
                >;
                recentChecks: z.ZodOptional<
                  z.ZodArray<
                    z.ZodObject<
                      {
                        dateId: z.ZodOptional<z.ZodString>;
                        passed: z.ZodOptional<z.ZodBoolean>;
                        passedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                      },
                      z.core.$loose
                    >
                  >
                >;
                preflightPending: z.ZodOptional<z.ZodInt>;
              },
              z.core.$loose
            >;
          },
          z.core.$loose
        >
      >
    >;
    403: typeof ForbiddenResponse;
  };
}> = runReads.defineRoute({
  method: 'get',
  path: '/channels/{channelId}/stream',
  operationId: 'getChannelStreamSettings',
  summary: "A channel's Broadcast page — ingest server, recommended profile, test history.",
  description:
    '**One of only five entries a control room has**, and it had no operation at all. Taking\n`stream` and `replays` away from a `director` left them an event board.\n\nIt also carries the **broadcast defaults** applied to new dates, which the Settings screen\nannounces and which had no carrier.\n\n**The stream key does not appear in it**: it appears in no list payload.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.STREAMING],
  parameters: [ChannelIdParameter],
  responses: {
    200: {
      description: 'Ingest, recommended profile, measured bitrate, check history.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z.looseObject({
                ingestUrl: z
                  .string()
                  .meta({
                    format: 'uri',
                  })
                  .optional(),
                recommendedProtocol: vocabularyOutLocal(
                  GET_DATE_TECH_PANE_INGEST_PROTOCOL,
                  'A transport or media capability, not a domain notion: the domain never chooses an ingest protocol, a container or a DRM system, and a new one appears because a device appeared.',
                ).optional(),
                recommendedBitrateKbps: z
                  .int()
                  .meta({ minimum: undefined, maximum: undefined })
                  .optional(),
                lastMeasuredUpKbps: z
                  .int()
                  .meta({ minimum: undefined, maximum: undefined })
                  .nullable()
                  .optional(),
                defaults: z
                  .looseObject({
                    ingestProtocol: vocabularyOutLocal(
                      GET_DATE_TECH_PANE_INGEST_PROTOCOL,
                      'A transport or media capability, not a domain notion: the domain never chooses an ingest protocol, a container or a DRM system, and a new one appears because a device appeared.',
                    ).optional(),
                    qualityLadder: z.array(z.string()).optional(),
                    holdScreenAutoAfterSec: z
                      .int()
                      .meta({ minimum: undefined, maximum: undefined })
                      .optional(),
                  })
                  .meta({
                    description: 'Applied to **new** dates, never retroactively.',
                  })
                  .optional(),
                recentChecks: z
                  .array(
                    z.looseObject({
                      dateId: uuidOut().optional(),
                      passed: z.boolean().optional(),
                      passedAt: InstantOut.nullable().optional(),
                    }),
                  )
                  .optional(),
                preflightPending: z
                  .int()
                  .meta({ minimum: undefined, maximum: undefined })
                  .meta({
                    description: 'The `preflightBadge`, **served** — it had no source at all.',
                  })
                  .optional(),
              }),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:12:00.000Z',
            rightsVersion: 412,
            data: {
              ingestUrl: 'rtmps://ingest.arthome.fr/live',
              recommendedProtocol: 'rtmps',
              recommendedBitrateKbps: 6000,
              lastMeasuredUpKbps: 8900,
              defaults: {
                ingestProtocol: 'rtmps',
                qualityLadder: ['1080p', '720p', '360p'],
                holdScreenAutoAfterSec: 15,
              },
              recentChecks: [],
              preflightPending: 1,
            },
          },
        },
      },
    },
  },
});
