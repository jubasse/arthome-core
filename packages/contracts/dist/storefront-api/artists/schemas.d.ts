import { z } from 'zod';
import type { VocabularyIn } from '@arthome/core/schema';
import type { QueryParameter } from '../../http/index.js';
declare const ARTIST_SORTS: readonly ["alpha", "followers"];
export declare const ArtistCategoryParameter: QueryParameter<'categoryId', z.ZodString>;
export declare const ArtistSortParameter: QueryParameter<'sort', z.ZodDefault<VocabularyIn<typeof ARTIST_SORTS>>>;
export declare const ArtistLiveOnlyParameter: QueryParameter<'liveOnly', z.ZodDefault<z.ZodBoolean>>;
export {};
//# sourceMappingURL=schemas.d.ts.map