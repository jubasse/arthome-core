import type { z } from 'zod';

import type { CategoryList } from './schemas.js';
import { CategoryListSchema } from './schemas.js';
import { CategoryScreenSchema, CategoryTileSchema } from '../../catalog/index.js';
import type { ModuleExamples } from '../../openapi/docs.js';

const categoryTile: z.output<typeof CategoryTileSchema> = {
  id: 'dance-contemporary',
  universe: 'stage',
  rank: 3,
  datesCount: 84,
  liveCount: 2,
  featured: true,
};

const categoryList: CategoryList = {
  servedAt: '2026-09-21T18:02:15.000Z',
  items: [categoryTile],
};

const categoryScreen: z.output<typeof CategoryScreenSchema> = {
  categoryId: 'dance-contemporary',
  subGenres: [{ id: 'dance-contemporary-repertoire', rank: 1 }],
  sections: [
    {
      id: 'overview',
      titleCode: 'category.section.overview',
      items: [],
      nextCursor: null,
    },
  ],
  facets: [],
};

export const categoriesExamples: ModuleExamples = [
  [CategoryTileSchema, [categoryTile]],
  [CategoryListSchema, [categoryList]],
  [CategoryScreenSchema, [categoryScreen]],
];
