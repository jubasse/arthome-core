import { z } from 'zod';
import { MODERATION_REASONS, MODERATION_VERDICTS } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import type { PathParameter } from '../../http/index.js';
export declare const ModerationItemIdParameter: PathParameter<'itemId', z.ZodString>;
export declare const SettleModerationItemBodySchema: z.ZodObject<{
    verdict: VocabularyIn<typeof MODERATION_VERDICTS>;
    expectedDecisionVersion: z.ZodInt;
    reason: z.ZodOptional<VocabularyIn<typeof MODERATION_REASONS>>;
    muteUntil: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    expectedVersion: z.ZodOptional<z.ZodInt>;
}, z.core.$strip>;
export type SettleModerationItemBody = z.output<typeof SettleModerationItemBodySchema>;
//# sourceMappingURL=schemas.d.ts.map