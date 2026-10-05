import { z } from 'zod';

import { Service } from '@arthome/core';
import type { VocabularyIn, VocabularyOut } from '@arthome/core/schema';
import {
  VOCABULARY_SOURCE_LOCAL,
  vocabularyIn,
  vocabularyOutLocal,
  uriIn,
} from '@arthome/core/schema';

import {
  BadRequestResponse,
  CacheControlPublicHeader,
  CursorParameter,
  GoneResponse,
  LimitParameter,
  NotFoundResponse,
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  VaryAuthHeader,
  PublicReadSecurity,
  storefrontV1,
} from './components.js';
import { ArtistSummarySchema, DateCardSchema, RailSchema } from '../catalog/index.js';
import { StorefrontEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonResponse, PathParameter, QueryParameter, Route } from '../http/index.js';

const discoveryRoutes = storefrontV1
  .tags(StorefrontTag.DISCOVERY)
  .headers(SurfaceParameter, TraceparentParameter)
  .security(...PublicReadSecurity);

const RESOLVE_PUBLIC_LINK_KIND = ['date', 'show', 'artist', 'category'] as const;

export const extendRail: Route<{
  method: 'get';
  version: 1;
  path: '/rails/{railId}';
  parameters: readonly [
    PathParameter<'railId', z.ZodString>,
    typeof CursorParameter,
    typeof LimitParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof RailSchema }, z.core.$loose>
      >
    >;
    404: typeof NotFoundResponse;
    410: typeof GoneResponse;
  };
}> = discoveryRoutes.defineRoute({
  method: 'get',
  path: '/rails/{railId}',
  operationId: 'extendRail',
  summary: 'Extends a home rail — the consumer of `Rail.nextCursor`.',
  description:
    '`Rail.nextCursor` was served and **no operation consumed it**. A rail extends, it does not\npaginate on screen: the cursor serves to append items on the right when the focus reaches\nthe edge, not to change page.\n\nComposition and order stay **server-side** — the surface never filters the catalogue.\n\n**Public read**, like the rail whose content it continues.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.CATALOG, Service.TICKETING, Service.IDENTITY, Service.STREAMING],
  'x-arthome-freshness': 60,
  parameters: [
    {
      name: 'railId',
      in: 'path',
      required: true,
      description: 'The `id` carried by the rail, never a string built by the surface.',
      schema: z.string(),
    },
    CursorParameter,
    LimitParameter,
  ],
  responses: {
    200: {
      description: 'The rest of the rail.',
      headers: {
        'Cache-Control': CacheControlPublicHeader,
        Vary: VaryAuthHeader,
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: RailSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:02:45.000Z',
            data: {
              id: 'cat-dance-contemporary',
              titleCode: 'home.rail.category',
              kind: 'category',
              itemKind: 'date',
              cardForm: 'wide',
              items: [],
              total: 84,
              totalIsLowerBound: false,
              nextCursor: null,
            },
          },
        },
      },
    },
    404: NotFoundResponse,
    410: GoneResponse,
  },
});

export const resolvePublicLink: Route<{
  method: 'get';
  version: 1;
  path: '/resolve';
  parameters: readonly [
    QueryParameter<'url', z.ZodString>,
    QueryParameter<'kind', VocabularyIn<typeof RESOLVE_PUBLIC_LINK_KIND>>,
    QueryParameter<'slug', z.ZodString>,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodObject<
              {
                kind: VocabularyOut;
                id: z.ZodString;
                canonicalUrl: z.ZodString;
                date: z.ZodOptional<typeof DateCardSchema>;
                artist: z.ZodOptional<typeof ArtistSummarySchema>;
              },
              z.core.$loose
            >;
          },
          z.core.$loose
        >
      >
    >;
    400: typeof BadRequestResponse;
    404: typeof NotFoundResponse;
  };
}> = discoveryRoutes.defineRoute({
  method: 'get',
  path: '/resolve',
  operationId: 'resolvePublicLink',
  summary: 'Resolves a canonical URL or a slug to the resource it designates.',
  description:
    '**`slug` and `canonicalUrl` were served everywhere and accepted nowhere.** Path identifiers\nare UUIDs; all five occurrences of `slug` were on output. A notification pushed to a dead\napplication, a shared link, a bookmark, a search engine result: all of them deliver a\n**URL**, and nothing in the contract knew how to read one.\n\nThe gap went beyond mobile: `canonicalUrl` is what the television encodes in the QR code of\nthe **Share** action — on a television, sharing cannot mean copying a link, there is neither\na useful clipboard nor a messaging app.\n\n**Resolves, does not redirect.** The response names the type and the identifier, and the\nsurface decides where to go: a mobile deep link, a Next route and a television page do not\nhave the same destination for the same resource.\n\n**Public read**: a shared link opens before any sign-in.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.CATALOG],
  'x-arthome-freshness': 300,
  parameters: [
    {
      name: 'url',
      in: 'query',
      description: 'Full canonical URL. Mutually exclusive with `kind` + `slug`.',
      schema: uriIn(),
    },
    {
      name: 'kind',
      in: 'query',
      schema: vocabularyIn(RESOLVE_PUBLIC_LINK_KIND).meta({
        'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
        'x-arthome-vocabulary-reason':
          'A screen composition the server decides so that five surfaces do not each decide it differently.',
      }),
    },
    {
      name: 'slug',
      in: 'query',
      description:
        "A date's slug is unique only within its show, so a date is named `{show-slug}/{date-slug}`.",
      schema: z.string(),
    },
  ],
  responses: {
    200: {
      description: 'The designated resource, and enough to paint immediately.',
      headers: {
        'Cache-Control': CacheControlPublicHeader,
        Vary: VaryAuthHeader,
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z.looseObject({
                kind: vocabularyOutLocal(
                  RESOLVE_PUBLIC_LINK_KIND,
                  'A screen composition the server decides so that five surfaces do not each decide it differently.',
                ),
                id: z.string(),
                canonicalUrl: z.string().meta({
                  format: 'uri',
                  description:
                    "**The target's canonical URL**, which may differ from the one requested: a short form\n(`/s/`, `/a/`), or a slug replaced less than `SLUG_REDIRECT_DAYS` ago (D-075), resolves to\nthe current form. That is what lets the surface correct its URL rather than keep a stale\none bookmarked.\n",
                }),
                date: DateCardSchema.optional(),
                artist: ArtistSummarySchema.optional(),
              }),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:02:50.000Z',
            data: {
              kind: 'date',
              id: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
              canonicalUrl: 'https://arthome.fr/show/nuit-blanche/date/2026-09-21',
            },
          },
        },
      },
    },
    400: BadRequestResponse,
    404: NotFoundResponse,
  },
});
