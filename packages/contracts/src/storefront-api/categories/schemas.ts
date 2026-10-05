import { z } from 'zod';

import type { VocabularyIn } from '@arthome/core/schema';

import { CategoryTileSchema, SearchCriteriaSchema } from '../../catalog/index.js';
import { StorefrontEnvelopeMetaSchema } from '../../envelope/index.js';
import type { QueryParameter } from '../../http/index.js';
import { localVocabulary } from '../../http/index.js';

const SORT_OR_FILTER_KEY =
  "A sort or filter key. It is a property of THIS endpoint's list — which orders it offers — not of the domain, and adding one is an endpoint change rather than a vocabulary change.";
const SCREEN_COMPOSITION =
  'A screen composition the server decides so that five surfaces do not each decide it differently.';
const CATEGORY_SCREEN_SECTIONS = ['overview', 'live', 'upcoming', 'replays', 'artists'] as const;
const CATEGORY_SCREEN_SORTS = [
  'relevance',
  'soon',
  'popularity',
  'price_asc',
  'price_desc',
] as const;

export const CategoryListSchema: z.ZodIntersection<
  typeof StorefrontEnvelopeMetaSchema,
  z.ZodObject<{ items: z.ZodArray<typeof CategoryTileSchema> }, z.core.$loose>
> = z.intersection(
  StorefrontEnvelopeMetaSchema,
  z.looseObject({
    items: z.array(CategoryTileSchema),
  }),
);

export const CategoryScreenSectionParameter: QueryParameter<
  'section',
  VocabularyIn<typeof CATEGORY_SCREEN_SECTIONS>
> = {
  name: 'section',
  in: 'query',
  description:
    '**Extend a single section.** Without this parameter the response serves the five bounded\nsections; with it, it serves that one section, paginated. This is what consumes the\n`sections[].nextCursor` the response already carried — four cursors served and no consumer,\nthat is, four "See more" buttons that led nowhere.\n',
  schema: localVocabulary(CATEGORY_SCREEN_SECTIONS, SCREEN_COMPOSITION),
};

export const SubGenreIdParameter: QueryParameter<'subGenreId', z.ZodString> = {
  name: 'subGenreId',
  in: 'query',
  description: '**Stable** sub-genre identifier, never an array index.',
  schema: z.string(),
};

export const CategoryFiltersParameter: QueryParameter<'filters', typeof SearchCriteriaSchema> = {
  name: 'filters',
  in: 'query',
  description:
    "Criteria, in the **same normalised grammar** as `/v1/search` and `SavedSearch.criteria`. The\ndiscipline's own filter panel — price, date, status, nearly sold out, on promotion — lands\nhere.\n",
  schema: SearchCriteriaSchema,
};

export const CategorySortParameter: QueryParameter<
  'sort',
  z.ZodDefault<VocabularyIn<typeof CATEGORY_SCREEN_SORTS>>
> = {
  name: 'sort',
  in: 'query',
  schema: localVocabulary(CATEGORY_SCREEN_SORTS, SORT_OR_FILTER_KEY).default('soon'),
};

export type CategoryList = z.output<typeof CategoryListSchema>;
