import {
  CategoryListSchema,
  CategoryFiltersParameter,
  CategoryScreenSectionParameter,
  CategorySortParameter,
  SubGenreIdParameter,
} from './schemas.js';
import type { GetCategoryScreenRoute, ListCategoriesRoute } from './types.js';
import { CategoryScreenSchema } from '../../catalog/index.js';
import { Freshness } from '../../http/index.js';
import {
  CategoryIdParameter,
  CursorParameter,
  LimitParameter,
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  publicRead,
  storefrontV1,
  viewer,
} from '../components.js';

const discovery = storefrontV1
  .identity(viewer)
  .optionalAuth()
  .headers(SurfaceParameter, TraceparentParameter)
  .tags(StorefrontTag.DISCOVERY);
const categories = discovery.resource('categories', { id: CategoryIdParameter });

export const listCategories: ListCategoriesRoute = discovery.single('categories').find({
  operationId: 'listCategories',
  summary: 'The 21 disciplines, with family, rank and counts.',
  cache: publicRead(Freshness.FIVE_MINUTES),
  responses: {
    200: {
      description: 'The disciplines.',
      content: { 'application/json': { schema: CategoryListSchema } },
    },
  },
});

export const getCategoryScreen: GetCategoryScreenRoute = categories.find({
  operationId: 'getCategoryScreen',
  summary: 'A discipline — hero, sub-genres, five bounded sections, facets.',
  parameters: [
    CategoryScreenSectionParameter,
    CursorParameter,
    LimitParameter,
    SubGenreIdParameter,
    CategoryFiltersParameter,
    CategorySortParameter,
  ],
  item: CategoryScreenSchema,
  cache: publicRead(Freshness.FIVE_MINUTES),
  answer: 'The discipline.',
});
