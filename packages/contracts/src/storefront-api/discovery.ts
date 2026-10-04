import { z } from 'zod';

import { DisplayState, ReplayPolicy, RightsScope, Service } from '@arthome/core';
import type { VocabularyIn, VocabularyOut } from '@arthome/core/schema';
import {
  VOCABULARY_SOURCE_LOCAL,
  vocabularyIn,
  vocabularyOutLocal,
  uriIn,
} from '@arthome/core/schema';

import {
  ArtistIdParameter,
  BadRequestResponse,
  CacheControlPublicHeader,
  CategoryIdParameter,
  CursorDirectionParameter,
  CursorParameter,
  GoneResponse,
  LimitParameter,
  NotFoundResponse,
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  UnauthorizedResponse,
  UnavailableResponse,
  VaryAuthHeader,
  ViewerTimezoneParameter,
  PublicReadSecurity,
  storefrontV1,
} from './components.js';
import {
  ArtistDetailSchema,
  ArtistSummarySchema,
  CategoryScreenSchema,
  CategoryTileSchema,
  DateCardSchema,
  FacetSchema,
  HomeScreenSchema,
  LiveScreenSchema,
  RailSchema,
  SearchCriteriaSchema,
  ShowGroupSchema,
  StructuredFilterSchema,
} from '../catalog/index.js';
import { StorefrontEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonResponse, PathParameter, QueryParameter, Route } from '../http/index.js';
import { EmptyReason, StorefrontCursorPageInfoSchema } from '../pagination/index.js';

const discoveryRoutes = storefrontV1
  .tags(StorefrontTag.DISCOVERY)
  .headers(SurfaceParameter, TraceparentParameter)
  .security(...PublicReadSecurity);

const GET_CATEGORY_SCREEN_SECTION = ['overview', 'live', 'upcoming', 'replays', 'artists'] as const;
const GET_CATEGORY_SCREEN_SORT = [
  'relevance',
  'soon',
  'popularity',
  'price_asc',
  'price_desc',
] as const;
const LIST_ARTISTS_SORT = ['alpha', 'followers'] as const;
const SEARCH_TAB = ['best', 'lives', 'replays', 'artists'] as const;
const LIST_REPLAYS_SORT = ['expiring_first', 'recent', 'popularity'] as const;
const RESOLVE_PUBLIC_LINK_KIND = ['date', 'show', 'artist', 'category'] as const;

export const getHomeScreen: Route<{
  method: 'get';
  version: 1;
  path: '/home';
  parameters: readonly [
    typeof ViewerTimezoneParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof HomeScreenSchema }, z.core.$loose>
      >
    >;
    401: typeof UnauthorizedResponse;
    503: typeof UnavailableResponse;
  };
}> = discoveryRoutes.defineRoute({
  method: 'get',
  path: '/home',
  operationId: 'getHomeScreen',
  summary: 'Billboard and rails, composed and ordered by the server.',
  description:
    '**One call.** Ten to thirteen rails, six to eight visible cards each, a cursor per rail:\n60 to 100 cards, on the order of 50 to 90 KB raw, under 15 KB once compressed.\n\nThe BFF composes this model with **three per-viewer overlays, batched by id lists** — never\none call per card. In steady state, the per-profile Redis cache (30 s TTL) brings the screen\ndown to one or two internal calls.\n\n**Public read.** Called **with no authentication at all**, this operation returns the\n**public body** — identical for every anonymous caller, hence shareable in a common cache.\nThe three per-viewer overlays (`watchVerdict`, `viewerRelations`, `viewerProgress`) are then\n**absent**, never null. Called with a session or a bearer token, it returns the public body\n**plus** the overlays, and becomes private.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.CATALOG, Service.TICKETING, Service.IDENTITY, Service.STREAMING],
  'x-arthome-freshness': 60,
  parameters: [ViewerTimezoneParameter],
  responses: {
    200: {
      description: 'Home.',
      headers: {
        'Cache-Control': CacheControlPublicHeader,
        Vary: VaryAuthHeader,
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: HomeScreenSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:02:13.900Z',
            validUntil: '2026-09-21T18:03:13.900Z',
            lastEventSeq: 918233,
            degraded: [],
            data: {
              billboard: {
                previewStartsAfterSec: 4,
                date: {
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
                  roomOpensAt: '2026-09-21T18:30:00Z',
                  displayState: DisplayState.LIVE,
                  displayStateValidUntil: '2026-09-21T20:35:00Z',
                  replay: {
                    policy: ReplayPolicy.INCLUDED,
                    windowHours: 72,
                  },
                  rights: {
                    scope: RightsScope.WORLDWIDE,
                    blackoutCountries: [],
                  },
                  media: {
                    wide: [],
                    poster: [],
                  },
                  viewers: 1842,
                },
              },
              rails: [
                {
                  id: 'resume',
                  titleCode: 'home.rail.resume',
                  kind: 'resume',
                  itemKind: 'date',
                  cardForm: 'wide',
                  items: [],
                  nextCursor: null,
                },
              ],
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
    503: UnavailableResponse,
  },
});

export const getLiveScreen: Route<{
  method: 'get';
  version: 1;
  path: '/live';
  parameters: readonly [
    typeof ViewerTimezoneParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof LiveScreenSchema }, z.core.$loose>
      >
    >;
    503: typeof UnavailableResponse;
  };
}> = discoveryRoutes.defineRoute({
  method: 'get',
  path: '/live',
  operationId: 'getLiveScreen',
  summary: "What is live now and tonight's grid, grouped in the viewer's local time.",
  description:
    "**One call**, and the hourly grouping is **server-side**: it depends on the viewer's\ntimezone, which the surface sends in a header. Grouped client-side it would be grouped five\ndifferent ways, and Next's server rendering does not know the visitor's timezone.\n\n**Public read.** Called **with no authentication at all**, this operation returns the\n**public body** — identical for every anonymous caller, hence shareable in a common\ncache. The three per-viewer overlays (`watchVerdict`, `viewerRelations`,\n`viewerProgress`) are then **absent**, never null. Called with a session or a bearer\ntoken, it returns the public body **plus** the overlays, and becomes private.\n",
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.CATALOG, Service.TICKETING, Service.STREAMING, Service.IDENTITY],
  'x-arthome-freshness': 15,
  parameters: [ViewerTimezoneParameter],
  responses: {
    200: {
      description: "Tonight's grid.",
      headers: {
        'Cache-Control': CacheControlPublicHeader,
        Vary: VaryAuthHeader,
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: LiveScreenSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:02:14.210Z',
            validUntil: '2026-09-21T18:02:29.210Z',
            data: {
              slots: [
                {
                  localHourLabelKey: '20',
                  startsAt: '2026-09-21T18:00:00Z',
                  dates: [],
                },
              ],
            },
          },
        },
      },
    },
    503: UnavailableResponse,
  },
});

export const listCategories: Route<{
  method: 'get';
  version: 1;
  path: '/categories';
  parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ items: z.ZodArray<typeof CategoryTileSchema> }, z.core.$loose>
      >
    >;
    503: typeof UnavailableResponse;
  };
}> = discoveryRoutes.defineRoute({
  method: 'get',
  path: '/categories',
  operationId: 'listCategories',
  summary: 'The 21 disciplines, with family, rank and counts.',
  description:
    '**One call, not one per tile.** The editorial rank is authoritative and **no surface\nreorders**. The full taxonomy is not here: it is an **immutable versioned artefact** served\nby the CDN, referenced in `ViewerContext`.\n\n**Public read.** Called **with no authentication at all**, this operation returns the\n**public body** — identical for every anonymous caller, hence shareable in a common\ncache. The three per-viewer overlays (`watchVerdict`, `viewerRelations`,\n`viewerProgress`) are then **absent**, never null. Called with a session or a bearer\ntoken, it returns the public body **plus** the overlays, and becomes private.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.CATALOG],
  'x-arthome-freshness': 300,
  responses: {
    200: {
      description: 'The disciplines.',
      headers: {
        'Cache-Control': CacheControlPublicHeader,
        Vary: VaryAuthHeader,
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              items: z.array(CategoryTileSchema),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:02:15.000Z',
            items: [
              {
                id: 'dance-contemporary',
                universe: 'stage',
                rank: 3,
                datesCount: 84,
                liveCount: 2,
                featured: true,
              },
            ],
          },
        },
      },
    },
    503: UnavailableResponse,
  },
});

export const getCategoryScreen: Route<{
  method: 'get';
  version: 1;
  path: '/categories/{categoryId}';
  parameters: readonly [
    typeof CategoryIdParameter,
    QueryParameter<'section', VocabularyIn<typeof GET_CATEGORY_SCREEN_SECTION>>,
    typeof CursorParameter,
    typeof LimitParameter,
    QueryParameter<'subGenreId', z.ZodString>,
    QueryParameter<'filters', typeof SearchCriteriaSchema>,
    QueryParameter<'sort', z.ZodDefault<VocabularyIn<typeof GET_CATEGORY_SCREEN_SORT>>>,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof CategoryScreenSchema }, z.core.$loose>
      >
    >;
    404: typeof NotFoundResponse;
  };
}> = discoveryRoutes.defineRoute({
  method: 'get',
  path: '/categories/{categoryId}',
  operationId: 'getCategoryScreen',
  summary: 'A discipline — hero, sub-genres, five bounded sections, facets.',
  description:
    '**One call.** The overview **does not paginate**: it is bounded (8 per section). The four\nother sections each carry their own cursor.\n\n**Public read.** Called **with no authentication at all**, this operation returns the\n**public body** — identical for every anonymous caller, hence shareable in a common\ncache. The three per-viewer overlays (`watchVerdict`, `viewerRelations`,\n`viewerProgress`) are then **absent**, never null. Called with a session or a bearer\ntoken, it returns the public body **plus** the overlays, and becomes private.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.CATALOG, Service.TICKETING, Service.IDENTITY, Service.STREAMING],
  'x-arthome-freshness': 300,
  parameters: [
    CategoryIdParameter,
    {
      name: 'section',
      in: 'query',
      description:
        '**Extend a single section.** Without this parameter the response serves the five bounded\nsections; with it, it serves that one section, paginated. This is what consumes the\n`sections[].nextCursor` the response already carried — four cursors served and no consumer,\nthat is, four "See more" buttons that led nowhere.\n',
      schema: vocabularyIn(GET_CATEGORY_SCREEN_SECTION).meta({
        'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
        'x-arthome-vocabulary-reason':
          'A screen composition the server decides so that five surfaces do not each decide it differently.',
      }),
    },
    CursorParameter,
    LimitParameter,
    {
      name: 'subGenreId',
      in: 'query',
      description: '**Stable** sub-genre identifier, never an array index.',
      schema: z.string(),
    },
    {
      name: 'filters',
      in: 'query',
      description:
        "Criteria, in the **same normalised grammar** as `/v1/search` and `SavedSearch.criteria`. The\ndiscipline's own filter panel — price, date, status, nearly sold out, on promotion — lands\nhere.\n",
      schema: SearchCriteriaSchema,
    },
    {
      name: 'sort',
      in: 'query',
      schema: vocabularyIn(GET_CATEGORY_SCREEN_SORT)
        .meta({
          'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
          'x-arthome-vocabulary-reason':
            "A sort or filter key. It is a property of THIS endpoint's list — which orders it offers — not of the domain, and adding one is an endpoint change rather than a vocabulary change.",
        })
        .default('soon'),
    },
  ],
  responses: {
    200: {
      description: 'The discipline.',
      headers: {
        'Cache-Control': CacheControlPublicHeader,
        Vary: VaryAuthHeader,
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: CategoryScreenSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:02:16.000Z',
            data: {
              categoryId: 'dance-contemporary',
              subGenres: [
                {
                  id: 'dance-contemporary-repertoire',
                  rank: 1,
                },
              ],
              sections: [
                {
                  id: 'overview',
                  titleCode: 'category.section.overview',
                  items: [],
                  nextCursor: null,
                },
              ],
              facets: [],
            },
          },
        },
      },
    },
    404: NotFoundResponse,
  },
});

export const listArtists: Route<{
  method: 'get';
  version: 1;
  path: '/artists';
  parameters: readonly [
    typeof CursorParameter,
    typeof CursorDirectionParameter,
    typeof LimitParameter,
    QueryParameter<'categoryId', z.ZodString>,
    QueryParameter<'sort', z.ZodDefault<VocabularyIn<typeof LIST_ARTISTS_SORT>>>,
    QueryParameter<'liveOnly', z.ZodDefault<z.ZodBoolean>>,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            items: z.ZodArray<typeof ArtistSummarySchema>;
            page: typeof StorefrontCursorPageInfoSchema;
          },
          z.core.$loose
        >
      >
    >;
    410: typeof GoneResponse;
  };
}> = discoveryRoutes.defineRoute({
  method: 'get',
  path: '/artists',
  operationId: 'listArtists',
  summary: 'The artist directory, by cursor.',
  description:
    'Two sorts only, and they are **served**: alphabetical and by follower count. The follower\ncount comes from **a single projection**, so that it never differs between the artist page\nand the list.\n\n**Public read.** Called **with no authentication at all**, this operation returns the\n**public body** — identical for every anonymous caller, hence shareable in a common\ncache. The three per-viewer overlays (`watchVerdict`, `viewerRelations`,\n`viewerProgress`) are then **absent**, never null. Called with a session or a bearer\ntoken, it returns the public body **plus** the overlays, and becomes private.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.CATALOG, Service.IDENTITY],
  'x-arthome-freshness': 300,
  parameters: [
    CursorParameter,
    CursorDirectionParameter,
    LimitParameter,
    {
      name: 'categoryId',
      in: 'query',
      schema: z.string(),
    },
    {
      name: 'sort',
      in: 'query',
      schema: vocabularyIn(LIST_ARTISTS_SORT)
        .meta({
          'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
          'x-arthome-vocabulary-reason':
            "A sort or filter key. It is a property of THIS endpoint's list — which orders it offers — not of the domain, and adding one is an endpoint change rather than a vocabulary change.",
        })
        .default('alpha'),
    },
    {
      name: 'liveOnly',
      in: 'query',
      schema: z.boolean().default(false),
    },
  ],
  responses: {
    200: {
      description: 'A page of artists.',
      headers: {
        'Cache-Control': CacheControlPublicHeader,
        Vary: VaryAuthHeader,
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              items: z.array(ArtistSummarySchema),
              page: StorefrontCursorPageInfoSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:02:17.000Z',
            items: [],
            page: {
              hasMore: false,
              nextCursor: null,
              prevCursor: null,
              approximateTotal: 213,
              totalIsLowerBound: false,
              emptyReason: EmptyReason.NO_MATCH_WITH_FILTERS,
              emptyActionCode: 'clear_filters',
            },
          },
        },
      },
    },
    410: GoneResponse,
  },
});

export const getArtistDetail: Route<{
  method: 'get';
  version: 1;
  path: '/artists/{artistId}';
  parameters: readonly [
    typeof ArtistIdParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof ArtistDetailSchema }, z.core.$loose>
      >
    >;
    404: typeof NotFoundResponse;
  };
}> = discoveryRoutes.defineRoute({
  method: 'get',
  path: '/artists/{artistId}',
  operationId: 'getArtistDetail',
  summary: "An artist's page, their dates and their replays in the same response.",
  description:
    '**One call**: the page, upcoming dates, past dates, replays and the shop in the same\nresponse. A page served in four calls would paint in four stages, which a screen three\nmetres away makes unreadable.\n\n**Public read.** Called **with no authentication at all**, this operation returns the\n**public body** — identical for every anonymous caller, hence shareable in a common\ncache. The three per-viewer overlays (`watchVerdict`, `viewerRelations`,\n`viewerProgress`) are then **absent**, never null. Called with a session or a bearer\ntoken, it returns the public body **plus** the overlays, and becomes private.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.CATALOG, Service.TICKETING, Service.IDENTITY, Service.STREAMING],
  'x-arthome-freshness': 300,
  parameters: [ArtistIdParameter],
  responses: {
    200: {
      description: 'The page.',
      headers: {
        'Cache-Control': CacheControlPublicHeader,
        Vary: VaryAuthHeader,
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: ArtistDetailSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:02:18.000Z',
            data: {
              id: '019928a0-7d31-7a10-b8c4-2f9e11a4c333',
              channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
              name: 'Compagnie Verticale',
              categoryId: 'dance-contemporary',
              followers: 4120,
              isLiveNow: true,
            },
          },
        },
      },
    },
    404: NotFoundResponse,
  },
});

export const search: Route<{
  method: 'get';
  version: 1;
  path: '/search';
  parameters: readonly [
    typeof CursorParameter,
    typeof LimitParameter,
    QueryParameter<'q', z.ZodString>,
    QueryParameter<'tab', z.ZodDefault<VocabularyIn<typeof SEARCH_TAB>>>,
    QueryParameter<'sort', z.ZodDefault<VocabularyIn<typeof GET_CATEGORY_SCREEN_SORT>>>,
    QueryParameter<'filters', typeof SearchCriteriaSchema>,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            groups: z.ZodOptional<z.ZodArray<typeof ShowGroupSchema>>;
            artists: z.ZodOptional<z.ZodArray<typeof ArtistSummarySchema>>;
            facets: z.ZodArray<typeof FacetSchema>;
            structuredFilters: z.ZodOptional<z.ZodArray<typeof StructuredFilterSchema>>;
            page: typeof StorefrontCursorPageInfoSchema;
          },
          z.core.$loose
        >
      >
    >;
    400: typeof BadRequestResponse;
    410: typeof GoneResponse;
  };
}> = discoveryRoutes.defineRoute({
  method: 'get',
  path: '/search',
  operationId: 'search',
  summary: 'Full-text search, facets counted on the current query, grouping by show.',
  description:
    '**The paginated unit is the show** for `best`, `lives` and `replays`; the `artists` tab\npaginates artists. The "soon" sort is that of the **representative date**, and the "this\nweekend" filter applies **before** grouping.\n\nFacet counts are computed on the current query and returned **in the same response**: no\nsecond call. The total count is **approximate and bounded** — exact up to the threshold served\nas `DomainConstants.searchExactTotalLimit`, a lower bound beyond it, and `totalIsLowerBound`\nsays which of the two it is.\n\n**Budget ≤ 200 ms**: a television\'s on-screen keyboard produces one character per press and\nthe results live as you type; beyond that, the visual feedback of typing comes adrift. The\nrequest is **cancellable** — the client closes the socket, the server gives up.\n\n**Public read.** Called **with no authentication at all**, this operation returns the\n**public body** — identical for every anonymous caller, hence shareable in a common\ncache. The three per-viewer overlays (`watchVerdict`, `viewerRelations`,\n`viewerProgress`) are then **absent**, never null. Called with a session or a bearer\ntoken, it returns the public body **plus** the overlays, and becomes private.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.CATALOG, Service.TICKETING, Service.IDENTITY, Service.STREAMING],
  'x-arthome-freshness': 60,
  parameters: [
    CursorParameter,
    LimitParameter,
    {
      name: 'q',
      in: 'query',
      schema: z.string().min(2),
    },
    {
      name: 'tab',
      in: 'query',
      schema: vocabularyIn(SEARCH_TAB)
        .meta({
          'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
          'x-arthome-vocabulary-reason':
            "A sort or filter key. It is a property of THIS endpoint's list — which orders it offers — not of the domain, and adding one is an endpoint change rather than a vocabulary change.",
        })
        .default('best'),
    },
    {
      name: 'sort',
      in: 'query',
      description:
        '**Five sorts**, not four: `price_desc` exists in the design, exactly like the other four.',
      schema: vocabularyIn(GET_CATEGORY_SCREEN_SORT)
        .meta({
          'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
          'x-arthome-vocabulary-reason':
            "A sort or filter key. It is a property of THIS endpoint's list — which orders it offers — not of the domain, and adding one is an endpoint change rather than a vocabulary change.",
        })
        .default('relevance'),
    },
    {
      name: 'filters',
      in: 'query',
      description:
        'Criteria, in the grammar **published** opposite. This parameter used to be a free string: on\nthe most important parameter of the most used screen, that meant zod validated nothing and\nthree surfaces would serialise it three ways — when a normalised shape **already exists**,\nsince `normalizeSearchCriteria()` produces its signature in `@arthome/core`. That is the\nshape published here, and it is the same one as `SavedSearch.criteria`.\n',
      schema: SearchCriteriaSchema,
    },
  ],
  responses: {
    200: {
      description: 'Results, facets and structured filters.',
      headers: {
        'Cache-Control': CacheControlPublicHeader,
        Vary: VaryAuthHeader,
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              groups: z.array(ShowGroupSchema).optional(),
              artists: z.array(ArtistSummarySchema).optional(),
              facets: z.array(FacetSchema),
              structuredFilters: z.array(StructuredFilterSchema).optional(),
              page: StorefrontCursorPageInfoSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:02:19.000Z',
            groups: [],
            facets: [
              {
                facetId: 'category',
                values: [
                  {
                    id: 'dance-contemporary',
                    count: 42,
                  },
                ],
              },
            ],
            structuredFilters: [
              {
                filterId: 'price',
                kind: 'money_range',
                min: 0,
                max: 9000,
              },
            ],
            page: {
              hasMore: true,
              nextCursor: 'eyJjIjoiMjAyNi0wOS0yMVQyMDowMDowMFoifQ',
              approximateTotal: 10000,
              totalIsLowerBound: true,
            },
          },
        },
      },
    },
    400: BadRequestResponse,
    410: GoneResponse,
  },
});

export const listReplays: Route<{
  method: 'get';
  version: 1;
  path: '/replays';
  parameters: readonly [
    typeof CursorParameter,
    typeof LimitParameter,
    QueryParameter<'sort', z.ZodDefault<VocabularyIn<typeof LIST_REPLAYS_SORT>>>,
    QueryParameter<'categoryId', z.ZodString>,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          { items: z.ZodArray<typeof DateCardSchema>; page: typeof StorefrontCursorPageInfoSchema },
          z.core.$loose
        >
      >
    >;
    410: typeof GoneResponse;
    503: typeof UnavailableResponse;
  };
}> = discoveryRoutes.defineRoute({
  method: 'get',
  path: '/replays',
  operationId: 'listReplays',
  summary: 'Replays online, the ones expiring first — a discovery page, public.',
  description:
    '**This is a discovery page, not "My replays".** The distinction is not cosmetic: "Replays"\nis a permanent entry in a television\'s sidebar, exactly like "Live" or "Categories", and it\nis not prefixed "My" — unlike "My seats" and "My list", which are. Its content is the\ncatalogue of replays **on sale or included**, including ones never watched: that is the\nwhole point of it.\n\nThree reasons the existing paths were no substitute: `/v1/me/replays` returns what one\n**holds** and answers `401` to a visitor — yet on a television the sidebar is always there,\nand hiding an entry based on the session makes the menu change size under the focus, which\nbreaks focus memory; `/v1/search?tab=replays` requires `q` of at least two characters, so\nit has no empty search; and its paginated unit is the **show**, whereas a replay window\nexpires **per date** — grouping by show makes the "expiring first" sort inexpressible.\n\n**Public read**, like the nine other catalogue operations.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.CATALOG, Service.TICKETING, Service.STREAMING],
  'x-arthome-freshness': 60,
  parameters: [
    CursorParameter,
    LimitParameter,
    {
      name: 'sort',
      in: 'query',
      description: '`expiring_first` is the default, and it is the sort the page announces.',
      schema: vocabularyIn(LIST_REPLAYS_SORT)
        .meta({
          'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
          'x-arthome-vocabulary-reason':
            "A sort or filter key. It is a property of THIS endpoint's list — which orders it offers — not of the domain, and adding one is an endpoint change rather than a vocabulary change.",
        })
        .default('expiring_first'),
    },
    {
      name: 'categoryId',
      in: 'query',
      schema: z.string(),
    },
  ],
  responses: {
    200: {
      description: 'Page of online replays, sorted by shortest remaining window first.',
      headers: {
        'Cache-Control': CacheControlPublicHeader,
        Vary: VaryAuthHeader,
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              items: z.array(DateCardSchema),
              page: StorefrontCursorPageInfoSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:02:40.000Z',
            validUntil: '2026-09-21T18:03:40.000Z',
            items: [],
            page: {
              hasMore: false,
              emptyReason: EmptyReason.NO_REPLAY_AVAILABLE,
              emptyActionCode: 'browse_catalog',
            },
          },
        },
      },
    },
    410: GoneResponse,
    503: UnavailableResponse,
  },
});

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
