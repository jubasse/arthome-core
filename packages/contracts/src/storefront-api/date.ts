import { z } from 'zod';

import {
  BlackoutReason,
  DisplayState,
  ReplayPolicy,
  RightsScope,
  Service,
  WatchDenialReason,
  WatchFallbackAction,
} from '@arthome/core';

import {
  CacheControlPublicHeader,
  DateIdParameter,
  NotFoundResponse,
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  VaryAuthHeader,
  PublicReadSecurity,
} from './components.js';
import { DateDetailSchema } from '../catalog/index.js';
import { StorefrontEnvelopeMetaSchema } from '../envelope/index.js';
import type { HeaderParameter, JsonResponse, Response, Route } from '../http/index.js';
import { defineRoute } from '../http/index.js';

export const getDateDetail: Route<{
  method: 'get';
  path: '/v1/dates/{dateId}';
  parameters: readonly [
    typeof DateIdParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    HeaderParameter<'If-None-Match', z.ZodString>,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof DateDetailSchema }, z.core.$loose>
      >
    >;
    304: Response;
    404: typeof NotFoundResponse;
  };
}> = defineRoute({
  method: 'get',
  path: '/v1/dates/{dateId}',
  operationId: 'getDateDetail',
  tags: [StorefrontTag.DATE],
  summary: "A date's page — series, suggestions, shop, prices, in the same response.",
  description:
    '**One call**, and it must be **cheap**: the television surface prefetches it for the focused\nitem once the focus has settled, and a prefetch paid for twice is worse than no prefetch at\nall. Hence a cache validator (`ETag`) and a declared freshness.\n\n**Public read.** Called **with no authentication at all**, this operation returns the\n**public body** — identical for every anonymous caller, hence shareable in a common\ncache. The three per-viewer overlays (`watchVerdict`, `viewerRelations`,\n`viewerProgress`) are then **absent**, never null. Called with a session or a bearer\ntoken, it returns the public body **plus** the overlays, and becomes private.\n',
  'x-arthome-maturity': 'stable',
  // `chat` is NOT called: the chat mode is already PROJECTED into `date_detail_public`
  // by `chat.date_chat_policy_changed`. It was both projected and called — one call for
  // data we already hold, and the storefront's only screen to cross the threshold of 4.
  'x-arthome-upstream': [Service.CATALOG, Service.TICKETING, Service.IDENTITY, Service.STREAMING],
  security: PublicReadSecurity,
  'x-arthome-freshness': 60,
  parameters: [
    DateIdParameter,
    SurfaceParameter,
    TraceparentParameter,
    {
      name: 'If-None-Match',
      in: 'header',
      required: false,
      schema: z.string(),
    },
  ],
  responses: {
    200: {
      description: 'The page.',
      headers: {
        'Cache-Control': CacheControlPublicHeader,
        Vary: VaryAuthHeader,
        ETag: {
          schema: z.string(),
          description: 'Cache validator, so the TV prefetch is not paid for twice.',
        },
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: DateDetailSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:02:21.000Z',
            validUntil: '2026-09-21T18:03:21.000Z',
            data: {
              id: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
              showId: '019928a0-7d31-7a10-b8c4-2f9e11a4c111',
              channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
              slug: '2026-09-21',
              canonicalUrl: 'https://arthome.fr/show/nuit-blanche/date/2026-09-21',
              title: 'Nuit blanche',
              startsAt: '2026-09-21T19:00:00Z',
              venueClock: {
                venueTimezone: 'Europe/Paris',
                venueUtcOffsetMin: 120,
              },
              runtimeMin: 95,
              displayState: DisplayState.LIVE,
              displayStateValidUntil: '2026-09-21T20:35:00Z',
              replay: {
                policy: ReplayPolicy.INCLUDED,
                windowHours: 72,
              },
              rights: {
                scope: RightsScope.RESTRICTED,
                blackoutCountries: ['CA'],
                blackoutReasonCode: BlackoutReason.BROADCASTER,
              },
              media: {
                wide: [],
                poster: [],
              },
              totalSeriesDates: 3,
              watchVerdict: {
                allowed: false,
                advisory: true,
                denialReasonCode: WatchDenialReason.NO_SEAT,
                fallbackAction: WatchFallbackAction.BUY_SEAT,
                validUntil: '2026-09-21T18:03:21.000Z',
              },
            },
          },
        },
      },
    },
    304: {
      description: 'Unchanged since the `ETag` supplied.',
    },
    404: NotFoundResponse,
  },
});
