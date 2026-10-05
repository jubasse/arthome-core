import { z } from 'zod';
import { MODERATION_REASONS } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import type { PathParameter } from '../../http/index.js';
export declare const ChatMessageIdParameter: PathParameter<'messageId', z.ZodString>;
export declare const ReportChatMessageBodySchema: z.ZodObject<{
    reason: VocabularyIn<typeof MODERATION_REASONS>;
}, z.core.$strip>;
export type ReportChatMessageBody = z.output<typeof ReportChatMessageBodySchema>;
//# sourceMappingURL=schemas.d.ts.map