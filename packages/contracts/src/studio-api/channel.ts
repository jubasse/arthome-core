import { z } from 'zod';

import { ChannelErrorCode, FailureNature, PublicationChecklistItem, Service } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { VOCABULARY_SOURCE_LOCAL, vocabularyIn } from '@arthome/core/schema';

import {
  BadRequestResponse,
  ChannelIdParameter,
  IdempotencyKeyParameter,
  IfRightsVersionParameter,
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  studioV1,
} from './components.js';
import { StudioEnvelopeMetaSchema, StudioErrorEnvelopeSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, Route } from '../http/index.js';
import { ReauthProof, recentAuth } from '../http/index.js';
import { UploadTicketSchema } from '../studio-stage/index.js';

const channelRoutes = studioV1
  .tags(StudioTag.CHANNEL)
  .headers(SurfaceParameter, IfRightsVersionParameter, TraceparentParameter);

const channelWrites = channelRoutes.headers(IdempotencyKeyParameter);

const CREATE_UPLOAD_TICKET_PURPOSE = ['poster', 'wide', 'avatar', 'merch_image'] as const;
const CREATE_UPLOAD_TICKET_CONTENT_TYPE = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const deleteChannel: Route<{
  method: 'delete';
  version: 1;
  path: '/channels/{channelId}';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<{ reauthToken: z.ZodString; confirmName: z.ZodString }, z.core.$strip>
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<{ deleted: z.ZodOptional<z.ZodBoolean> }, z.core.$loose>
            >;
          },
          z.core.$loose
        >
      >
    >;
    409: JsonResponse<typeof StudioErrorEnvelopeSchema>;
  };
}> = channelWrites.defineRoute({
  method: 'delete',
  path: '/channels/{channelId}',
  operationId: 'deleteChannel',
  summary: 'Deletes a channel.',
  description:
    '**Refused while a date remains on sale or a payout is owed.** These facts are **projected\nand held locally** by `identity` (`channel_dues`), never asked of `ticketing` or `payouts`\nsynchronously: that is precisely the kind of call "no synchronous call between services"\nforbids.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  requires: [recentAuth()],
  parameters: [ChannelIdParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: ReauthProof.extend({ confirmName: z.string() }),
        example: {
          reauthToken: 'ott_9f2ac1',
          confirmName: 'Compagnie Verticale',
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Channel deleted.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  deleted: z.boolean().optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:22:00.000Z',
            rightsVersion: 413,
            data: {
              deleted: true,
            },
          },
        },
      },
    },
    409: {
      description: '`channel.has_open_obligations`, with the detail.',
      content: {
        'application/json': {
          schema: StudioErrorEnvelopeSchema,
          example: {
            error: {
              code: ChannelErrorCode.CHANNEL_HAS_OPEN_OBLIGATIONS,
              nature: FailureNature.REFUSED,
              params: {
                datesOnSale: 3,
                payoutsDue: 1,
              },
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T18:22:00.000Z',
          },
        },
      },
    },
  },
});

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
