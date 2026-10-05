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
  UnavailableResponse,
  VaryAuthHeader,
  PublicReadSecurity,
  storefrontV1,
} from './components.js';
import {
  ArtistSummarySchema,
  DateCardSchema,
  FacetSchema,
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

const GET_CATEGORY_SCREEN_SORT = [
  'relevance',
  'soon',
  'popularity',
  'price_asc',
  'price_desc',
] as const;

const SEARCH_TAB = ['best', 'lives', 'replays', 'artists'] as const;
const LIST_REPLAYS_SORT = ['expiring_first', 'recent', 'popularity'] as const;
const RESOLVE_PUBLIC_LINK_KIND = ['date', 'show', 'artist', 'category'] as const;

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
