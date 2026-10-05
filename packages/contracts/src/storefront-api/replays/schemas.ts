import { z } from 'zod';

import type { VocabularyIn } from '@arthome/core/schema';

import type { QueryParameter } from '../../http/index.js';
import { localVocabulary } from '../../http/index.js';

const SORT_OR_FILTER_KEY =
  "A sort or filter key. It is a property of THIS endpoint's list — which orders it offers — not of the domain, and adding one is an endpoint change rather than a vocabulary change.";
const REPLAY_SORTS = ['expiring_first', 'recent', 'popularity'] as const;

export const ReplaySortParameter: QueryParameter<
  'sort',
  z.ZodDefault<VocabularyIn<typeof REPLAY_SORTS>>
> = {
  name: 'sort',
  in: 'query',
  description: '`expiring_first` is the default, and it is the sort the page announces.',
  schema: localVocabulary(REPLAY_SORTS, SORT_OR_FILTER_KEY).default('expiring_first'),
};

export const ReplayCategoryParameter: QueryParameter<'categoryId', z.ZodString> = {
  name: 'categoryId',
  in: 'query',
  schema: z.string(),
};
