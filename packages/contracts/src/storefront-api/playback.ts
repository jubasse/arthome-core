import { z } from 'zod';

import {
  ChatMode,
  DisplayState,
  FailureNature,
  IdentityErrorCode,
  Locale,
  PriceTier,
  Service,
  WatchDenialReason,
} from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { uuidOut, VOCABULARY_SOURCE_LOCAL, vocabularyIn, uuidIn } from '@arthome/core/schema';

import {
  CsrfRefusedResponse,
  DateIdParameter,
  NotFoundResponse,
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  UnavailableResponse,
  storefrontV1,
} from './components.js';
import { StorefrontEnvelopeMetaSchema, StorefrontErrorEnvelopeSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, Route } from '../http/index.js';
import { PlaybackRenewalSchema, PlaybackTicketSchema } from '../streaming/index.js';

const playbackRoutes = storefrontV1
  .tags(StorefrontTag.PLAYBACK)
  .headers(SurfaceParameter, TraceparentParameter)
  .errors({ 404: NotFoundResponse })
  .security(
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  );

const OPEN_PLAYBACK_KIND: readonly [typeof DisplayState.LIVE, typeof DisplayState.REPLAY] = [
  DisplayState.LIVE,
  DisplayState.REPLAY,
];
const OPEN_PLAYBACK_DRM_SYSTEMS = ['fairplay', 'widevine', 'playready'] as const;

export const openPlayback: Route<{
  method: 'post';
  version: 1;
  path: '/playback/{dateId}/open';
  parameters: readonly [
    typeof DateIdParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        deviceId: z.ZodString;
        kind: VocabularyIn<typeof OPEN_PLAYBACK_KIND>;
        profileId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        capabilities: z.ZodOptional<
          z.ZodObject<
            {
              drmSystems: z.ZodOptional<z.ZodArray<VocabularyIn<typeof OPEN_PLAYBACK_DRM_SYSTEMS>>>;
              hardwareSecureDecode: z.ZodOptional<z.ZodBoolean>;
              maxHeightPx: z.ZodOptional<z.ZodInt>;
            },
            z.core.$strip
          >
        >;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof PlaybackTicketSchema }, z.core.$loose>
      >
    >;
    403: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
    404: typeof NotFoundResponse;
    503: typeof UnavailableResponse;
  };
}> = playbackRoutes.defineRoute({
  method: 'post',
  path: '/playback/{dateId}/open',
  operationId: 'openPlayback',
  summary: 'The binding verdict, the token, the lease, and the whole player screen.',
  description:
    "**This is the only evaluation of the right that is authoritative**, because it is the only\none that produces a token. The verdict served on a card is advisory (`advisory: true`); this\none is not.\n\n**The right is rechecked when playback starts, never inherited from the catalogue**: the\nviewer's country changes between the two — travel, roaming, a corporate network — and on\nmobile that gap is measured in hours.\n\n**Budget ≤ 1 s.** All the screen's material arrives here: chapters, tracks, chat mode,\nongoing incident, resume point, live edge, DRM, quality cap. No panel of the player should\ntrigger another call.\n\n**`Cache-Control: no-store`.** A right read back from disk is a false right.\n",
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.STREAMING],
  'x-arthome-idempotency-exemption':
    '**Idempotency would be redundant here, because resumption already provides it.** An opening\non a `deviceId` that holds a live lease **resumes that lease** and returns the same\n`sessionId`: the effect of a second call is the effect of the first, by construction and not\nby memorisation. Adding a key would additionally memorise a `PlaybackTicket` — hence a signed\ntoken and its expiry instant — in a 24-hour store, for a response the contract says is\n**never** cached.\n',
  parameters: [DateIdParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          deviceId: uuidOut().meta({
            description:
              '**This is what carries resumption.** An opening on a `deviceId` that already holds a live\nlease for this date **resumes that lease** and returns the same `sessionId`; it does not open\na second one and does not consume another screen. The promise "you can resume your own\nsession, identified by the device" was written in the answers to the surfaces and was carried\nnowhere in the contract.\n',
          }),
          kind: vocabularyIn(OPEN_PLAYBACK_KIND).meta({
            'x-arthome-vocabulary-source': 'DISPLAY_STATES',
            'x-arthome-vocabulary-narrowing':
              'Only two of the eleven states can be opened. The other nine are not refused as unknown values, they are not openable.',
            description:
              '**A strict narrowing of `DISPLAY_STATES`, and the narrowing is the rule.** Only two\nof the eleven states can be opened: you watch a date that is on air, or a replay.\nThe other nine are not refused here as unknown values, they are **not openable**.\n',
          }),
          profileId: uuidOut().nullable().optional(),
          capabilities: z
            .object({
              drmSystems: z
                .array(
                  vocabularyIn(OPEN_PLAYBACK_DRM_SYSTEMS).meta({
                    'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
                    'x-arthome-vocabulary-reason':
                      'A transport or media capability, not a domain notion: the domain never chooses an ingest protocol, a container or a DRM system, and a new one appears because a device appeared.',
                  }),
                )
                .optional(),
              hardwareSecureDecode: z.boolean().optional(),
              maxHeightPx: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
            })
            .meta({
              description:
                'What the device **can do**, declared. The server chooses protocol, DRM and quality cap; **a\nclient that guesses gets it wrong**, and it gets it wrong on the devices we cannot test.\n',
            })
            .optional(),
        }),
        example: {
          deviceId: '019928f4-1b6c-7c3a-9f2e-6a1d0c4b8e77',
          kind: DisplayState.LIVE,
          capabilities: {
            drmSystems: ['fairplay'],
            hardwareSecureDecode: true,
            maxHeightPx: 2160,
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Right granted. The token, the lease and the complete screen.',
      headers: {
        'Cache-Control': {
          schema: z.literal('no-store'),
          description:
            '`no-store` is not an optimisation: it is what keeps the token out of the HTTP cache and out of the application snapshot taken when it goes to the background.',
        },
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: PlaybackTicketSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:05:00.000Z',
            validUntil: '2026-09-21T19:07:00.000Z',
            data: {
              sessionId: '019928f7-0000-7000-8000-000000000001',
              dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
              scope: PriceTier.FULL,
              protocol: 'hls',
              drmSystem: 'fairplay',
              qualityCap: 'fhd',
              manifestUrl: 'https://cdn.arthome.fr/playback/a9f1c0/master.m3u8',
              signature: {
                queryToken: 'Expires=1790000000&Signature=abc',
                cookieSet: null,
              },
              edgeRenewalMode: 'query_token',
              expiresAt: '2026-09-21T19:07:00.000Z',
              renewAfterSec: 45,
              leaseExpiresAt: '2026-09-21T19:06:30.000Z',
              chatMode: ChatMode.OPEN,
              chatRateLimitPerSecond: 2,
              liveEdgeSec: 6,
              chapters: [],
              audioTracks: [
                {
                  id: 'fr-main',
                  language: Locale.FR,
                  kind: 'main',
                },
              ],
              subtitleTracks: [],
              incident: null,
            },
          },
        },
      },
    },
    403: {
      description:
        "Right refused. The `code` is one of the ten in the closed vocabulary, and each produces a\ndifferent screen. On `watch.concurrent_limit_reached`, `params.activeSessions` carries the **list\nof active sessions** so the surface can offer to release one: a bare refusal would leave the\nviewer with no way out.\n\nAlso `api.forbidden` when a write with the session cookie lacks its `X-Arthome-Csrf` token, or carries another session's (`CsrfRefused`).\n",
      content: {
        'application/json': {
          schema: StorefrontErrorEnvelopeSchema,
          example: {
            error: {
              code: WatchDenialReason.CONCURRENT_LIMIT_REACHED,
              nature: FailureNature.REFUSED,
              params: {
                allowed: 2,
                activeSessions: [
                  {
                    sessionId: '019928f7-0000-7000-8000-0000000000aa',
                    deviceId: '019928f4-1b6c-7c3a-9f2e-6a1d0c4b8e77',
                    isCurrentDevice: false,
                    deviceLabel: 'Téléviseur du salon',
                    city: 'Paris',
                    openedAt: '2026-09-21T19:00:00Z',
                  },
                ],
              },
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T19:05:00.000Z',
          },
        },
      },
    },
    503: UnavailableResponse,
  },
});

export const renewPlaybackTicket: Route<{
  method: 'post';
  version: 1;
  path: '/playback/sessions/{sessionId}/renew';
  parameters: readonly [
    PathParameter<'sessionId', z.ZodString>,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof PlaybackRenewalSchema }, z.core.$loose>
      >
    >;
    403: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
    404: typeof NotFoundResponse;
    503: typeof UnavailableResponse;
  };
}> = playbackRoutes.defineRoute({
  method: 'post',
  path: '/playback/sessions/{sessionId}/renew',
  operationId: 'renewPlaybackTicket',
  summary: 'Renews the token and extends the lease, without restarting playback.',
  description:
    '**Every 45 s**, for a 120 s token and a 90 s lease. It is the renewal that carries the\nconcurrent-screen limit: **the window during which someone watches a stream they are no\nlonger entitled to is exactly the renewal interval.**\n\nThe response contains **nothing that would force a manifest reload**: the path is stable,\nonly the signature changes.\n\n**Four distinct refusal codes**, because the surface displays four different messages. A\ngeneric code would produce a false one three times out of four.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.STREAMING],
  'x-arthome-idempotency-exemption':
    '**A renewal must produce a fresh window, never a memorised one.** Returning the original\nresponse would return a token already part-spent — and, at the worst moment, an already\nexpired one — when the call exists precisely to obtain a new one. It is also this renewal\nthat carries the concurrent-screen limit: replaying it from a store would bypass the count.\n',
  parameters: [
    {
      name: 'sessionId',
      in: 'path',
      required: true,
      schema: uuidIn(),
    },
  ],
  responses: {
    200: {
      description: 'Token renewed.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: PlaybackRenewalSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:05:45.000Z',
            data: {
              expiresAt: '2026-09-21T19:07:45.000Z',
              renewAfterSec: 45,
              leaseExpiresAt: '2026-09-21T19:07:15.000Z',
              signature: {
                queryToken: 'Expires=1790000120&Signature=def',
                cookieSet: null,
              },
              qualityCap: 'fhd',
            },
          },
        },
      },
    },
    403: {
      description:
        "Renewal refused. `SEAT_EXPIRED` · `watch.concurrent_limit_reached` · `identity.signed_out_elsewhere` ·\n`watch.preview_exhausted` · `DATE_INTERRUPTED`. `identity.signed_out_elsewhere` is what the television\nsigned out from the web sees — **not a network error**. **Real window: up to 120 s** — see\n`revokeDevice`.\n\nAlso `api.forbidden` when a write with the session cookie lacks its `X-Arthome-Csrf` token, or carries another session's (`CsrfRefused`).\n",
      content: {
        'application/json': {
          schema: StorefrontErrorEnvelopeSchema,
          example: {
            error: {
              code: IdentityErrorCode.SIGNED_OUT_ELSEWHERE,
              nature: FailureNature.REFUSED,
              params: {},
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T19:06:30.000Z',
          },
        },
      },
    },
    503: UnavailableResponse,
  },
});

export const releasePlayback: Route<{
  method: 'post';
  version: 1;
  path: '/playback/sessions/{sessionId}/release';
  parameters: readonly [
    PathParameter<'sessionId', z.ZodString>,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<{ released: z.ZodOptional<z.ZodBoolean> }, z.core.$loose>
            >;
          },
          z.core.$loose
        >
      >
    >;
    404: typeof NotFoundResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = playbackRoutes.defineRoute({
  method: 'post',
  path: '/playback/sessions/{sessionId}/release',
  operationId: 'releasePlayback',
  summary: 'Releases a playback session — speeds things up, guarantees nothing.',
  description:
    '**Nothing depends on it.** A television is unplugged, a set-top box cuts out, the operating\nsystem kills a mobile application without warning: it is the **lease** that expires (90 s),\nnever this call that closes. A session that only closed on a client event would leave a ghost\nscreen, and the viewer would be refused their own second playback.\n\nThe client can **resume its own session**, identified by `deviceId`: reopening the player on\nthe same device reuses the lease instead of opening a second one.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.STREAMING],
  'x-arthome-idempotency-exemption':
    '**Idempotent by nature, and nothing depends on it.** Releasing twice leaves the same state,\nand it is the **expiring lease** that is authoritative — this call merely speeds things up. A\nkey would protect an effect that has neither accumulation nor consequence.\n',
  parameters: [
    {
      name: 'sessionId',
      in: 'path',
      required: true,
      schema: uuidIn(),
    },
  ],
  responses: {
    200: {
      description: 'Released, or already released — both succeed.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  released: z.boolean().optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T20:40:00.000Z',
            data: {
              released: true,
            },
          },
        },
      },
    },
    403: CsrfRefusedResponse,
  },
});
