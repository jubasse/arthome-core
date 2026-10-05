import type { z } from 'zod';
import type { VocabularyIn } from '@arthome/core/schema';
import type { PathParameter } from '../../http/index.js';
declare const COUNTERSIGN_DECISIONS: readonly ["countersign", "reject"];
export declare const BankChangeRequestIdParameter: PathParameter<'requestId', z.ZodString>;
export declare const CountersignBankChangeBodySchema: z.ZodObject<{
    reauthToken: z.ZodString;
    decision: VocabularyIn<typeof COUNTERSIGN_DECISIONS>;
}, z.core.$strip>;
export type CountersignBankChangeBody = z.output<typeof CountersignBankChangeBodySchema>;
export {};
//# sourceMappingURL=schemas.d.ts.map