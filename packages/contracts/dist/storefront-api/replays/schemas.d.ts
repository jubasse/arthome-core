import { z } from 'zod';
import type { VocabularyIn } from '@arthome/core/schema';
import type { QueryParameter } from '../../http/index.js';
declare const REPLAY_SORTS: readonly ["expiring_first", "recent", "popularity"];
export declare const ReplaySortParameter: QueryParameter<'sort', z.ZodDefault<VocabularyIn<typeof REPLAY_SORTS>>>;
export declare const ReplayCategoryParameter: QueryParameter<'categoryId', z.ZodString>;
export {};
//# sourceMappingURL=schemas.d.ts.map