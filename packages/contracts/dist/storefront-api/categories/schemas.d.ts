import { z } from 'zod';
import type { VocabularyIn } from '@arthome/core/schema';
import { CategoryTileSchema, SearchCriteriaSchema } from '../../catalog/index.js';
import { StorefrontEnvelopeMetaSchema } from '../../envelope/index.js';
import type { QueryParameter } from '../../http/index.js';
declare const CATEGORY_SCREEN_SECTIONS: readonly ["overview", "live", "upcoming", "replays", "artists"];
declare const CATEGORY_SCREEN_SORTS: readonly ["relevance", "soon", "popularity", "price_asc", "price_desc"];
export declare const CategoryListSchema: z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
    items: z.ZodArray<typeof CategoryTileSchema>;
}, z.core.$loose>>;
export declare const CategoryScreenSectionParameter: QueryParameter<'section', VocabularyIn<typeof CATEGORY_SCREEN_SECTIONS>>;
export declare const SubGenreIdParameter: QueryParameter<'subGenreId', z.ZodString>;
export declare const CategoryFiltersParameter: QueryParameter<'filters', typeof SearchCriteriaSchema>;
export declare const CategorySortParameter: QueryParameter<'sort', z.ZodDefault<VocabularyIn<typeof CATEGORY_SCREEN_SORTS>>>;
export type CategoryList = z.output<typeof CategoryListSchema>;
export {};
//# sourceMappingURL=schemas.d.ts.map