import { z } from 'zod';

import { PublicationChecklistItem, Service } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { VOCABULARY_SOURCE_LOCAL, vocabularyIn } from '@arthome/core/schema';

import {
  BadRequestResponse,
  IdempotencyKeyParameter,
  IfRightsVersionParameter,
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  studioV1,
} from './components.js';
import { StudioEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, Route } from '../http/index.js';
import { UploadTicketSchema } from '../studio-stage/index.js';

const channelRoutes = studioV1
  .tags(StudioTag.CHANNEL)
  .headers(SurfaceParameter, IfRightsVersionParameter, TraceparentParameter);

const channelWrites = channelRoutes.headers(IdempotencyKeyParameter);

const CREATE_UPLOAD_TICKET_PURPOSE = ['poster', 'wide', 'avatar', 'merch_image'] as const;
const CREATE_UPLOAD_TICKET_CONTENT_TYPE = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const createUploadTicket: Route<{
  method: 'post';
  version: 1;
  path: '/uploads';
  parameters: readonly [
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        purpose: VocabularyIn<typeof CREATE_UPLOAD_TICKET_PURPOSE>;
        contentType: VocabularyIn<typeof CREATE_UPLOAD_TICKET_CONTENT_TYPE>;
        sizeBytes: z.ZodInt;
      },
      z.core.$strip
    >
  >;
  responses: {
    201: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof UploadTicketSchema }, z.core.$loose>
      >
    >;
    400: typeof BadRequestResponse;
  };
}> = channelWrites.defineRoute({
  method: 'post',
  path: '/uploads',
  operationId: 'createUploadTicket',
  summary: 'Obtains a signed upload URL for a binary.',
  description:
    "**Never `multipart` from a WebView.** A JSON command returns a signed upload URL, valid for\n**15 minutes** — long enough for a room's 4G, short enough not to be an access token in\ndisguise.\n",
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.CATALOG],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          purpose: vocabularyIn(CREATE_UPLOAD_TICKET_PURPOSE).meta({
            'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
            'x-arthome-vocabulary-reason':
              'A vocabulary local to this contract. The domain neither produces nor consumes these values — they describe what this endpoint offers, and a new member is an endpoint change.',
          }),
          contentType: vocabularyIn(CREATE_UPLOAD_TICKET_CONTENT_TYPE).meta({
            'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
            'x-arthome-vocabulary-reason':
              'A transport or media capability, not a domain notion: the domain never chooses an ingest protocol, a container or a DRM system, and a new one appears because a device appeared.',
          }),
          sizeBytes: z.int().min(1).max(20971520),
        }),
        example: {
          purpose: PublicationChecklistItem.POSTER,
          contentType: 'image/jpeg',
          sizeBytes: 842000,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Signed upload URL.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: UploadTicketSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:45:00.000Z',
            rightsVersion: 412,
            data: {
              assetId: '019928e9-0000-7000-8000-000000000001',
              uploadUrl: 'https://uploads.arthome.fr/putt/019928e9',
              fields: {
                policy: 'eyJ...',
                signature: 'abc',
              },
              expiresAt: '2026-09-21T19:00:00Z',
            },
          },
        },
      },
    },
    400: BadRequestResponse,
  },
});
