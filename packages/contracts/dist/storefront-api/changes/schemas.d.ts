import type { z } from 'zod';
import type { VocabularyIn } from '@arthome/core/schema';
import type { QueryParameter } from '../../http/index.js';
declare const CHANGES_SCOPES: readonly ["profile", "device"];
export declare const ChangesSinceParameter: QueryParameter<'since', z.ZodString, true>;
export declare const ChangesScopeParameter: QueryParameter<'scope', z.ZodDefault<VocabularyIn<typeof CHANGES_SCOPES>>>;
export {};
//# sourceMappingURL=schemas.d.ts.map