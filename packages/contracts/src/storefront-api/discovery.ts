import { z } from 'zod';

import { Service } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { VOCABULARY_SOURCE_LOCAL, vocabularyIn } from '@arthome/core/schema';

import {
  BadRequestResponse,
  CacheControlPublicHeader,
  CursorParameter,
  GoneResponse,
  LimitParameter,
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  VaryAuthHeader,
} from './components.js';
import {
  ArtistSummarySchema,
  FacetSchema,
  SearchCriteriaSchema,
  ShowGroupSchema,
  StructuredFilterSchema,
} from '../catalog/index.js';
import { StorefrontEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonResponse, QueryParameter, Route } from '../http/index.js';
import { defineRoute } from '../http/index.js';
import { StorefrontCursorPageInfoSchema } from '../pagination/index.js';

const SEARCH_TAB = ['best', 'lives', 'replays', 'artists'] as const;
const SEARCH_SORT = ['relevance', 'soon', 'popularity', 'price_asc', 'price_desc'] as const;

export const search: Route<{
  method: 'get';
  path: '/v1/search';
  parameters: readonly [
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof CursorParameter,
    typeof LimitParameter,
    QueryParameter<'q', z.ZodString>,
    QueryParameter<'tab', z.ZodDefault<VocabularyIn<typeof SEARCH_TAB>>>,
    QueryParameter<'sort', z.ZodDefault<VocabularyIn<typeof SEARCH_SORT>>>,
    QueryParameter<'filters', typeof SearchCriteriaSchema>,
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
}> = defineRoute({
  method: 'get',
  path: '/v1/search',
  operationId: 'search',
  tags: [StorefrontTag.DISCOVERY],
  summary: 'Full-text search, facets counted on the current query, grouping by show.',
  description:
    '**The paginated unit is the show** for `best`, `lives` and `replays`; the `artists` tab\npaginates artists. The "soon" sort is that of the **representative date**, and the "this\nweekend" filter applies **before** grouping.\n\nFacet counts are computed on the current query and returned **in the same response**: no\nsecond call. The total count is **approximate and bounded** — exact up to the threshold served\nas `DomainConstants.searchExactTotalLimit`, a lower bound beyond it, and `totalIsLowerBound`\nsays which of the two it is.\n\n**Budget ≤ 200 ms**: a television\'s on-screen keyboard produces one character per press and\nthe results live as you type; beyond that, the visual feedback of typing comes adrift. The\nrequest is **cancellable** — the client closes the socket, the server gives up.\n\n**Public read.** Called **with no authentication at all**, this operation returns the\n**public body** — identical for every anonymous caller, hence shareable in a common\ncache. The three per-viewer overlays (`watchVerdict`, `viewerRelations`,\n`viewerProgress`) are then **absent**, never null. Called with a session or a bearer\ntoken, it returns the public body **plus** the overlays, and becomes private.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.CATALOG, Service.TICKETING, Service.IDENTITY, Service.STREAMING],
  security: [
    {},
    {
      sessionCookie: [],
    },
    {
      bearerToken: [],
    },
    {
      deviceToken: [],
    },
  ],
  'x-arthome-freshness': 60,
  parameters: [
    SurfaceParameter,
    TraceparentParameter,
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
      schema: vocabularyIn(SEARCH_SORT)
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
