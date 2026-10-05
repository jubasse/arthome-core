import type { SearchResults } from './schemas.js';
import { SearchResultsSchema } from './schemas.js';
import type { ModuleExamples } from '../../openapi/docs.js';

const searchResults: SearchResults = {
  servedAt: '2026-09-21T18:02:19.000Z',
  groups: [],
  facets: [
    {
      facetId: 'category',
      values: [{ id: 'dance-contemporary', count: 42 }],
    },
  ],
  structuredFilters: [{ filterId: 'price', kind: 'money_range', min: 0, max: 9000 }],
  page: {
    hasMore: true,
    nextCursor: 'eyJjIjoiMjAyNi0wOS0yMVQyMDowMDowMFoifQ',
    approximateTotal: 10000,
    totalIsLowerBound: true,
  },
};

export const searchExamples: ModuleExamples = [[SearchResultsSchema, [searchResults]]];
