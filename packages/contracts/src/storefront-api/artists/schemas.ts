import { z } from 'zod';

import type { VocabularyIn } from '@arthome/core/schema';

import type { QueryParameter } from '../../http/index.js';
import { localVocabulary } from '../../http/index.js';

const SORT_OR_FILTER_KEY =
  "A sort or filter key. It is a property of THIS endpoint's list — which orders it offers — not of the domain, and adding one is an endpoint change rather than a vocabulary change.";
const ARTIST_SORTS = ['alpha', 'followers'] as const;

export const ArtistCategoryParameter: QueryParameter<'categoryId', z.ZodString> = {
  name: 'categoryId',
  in: 'query',
  schema: z.string(),
};

export const ArtistSortParameter: QueryParameter<
  'sort',
  z.ZodDefault<VocabularyIn<typeof ARTIST_SORTS>>
> = {
  name: 'sort',
  in: 'query',
  schema: localVocabulary(ARTIST_SORTS, SORT_OR_FILTER_KEY).default('alpha'),
};

export const ArtistLiveOnlyParameter: QueryParameter<'liveOnly', z.ZodDefault<z.ZodBoolean>> = {
  name: 'liveOnly',
  in: 'query',
  schema: z.boolean().default(false),
};
