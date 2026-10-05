import { z } from 'zod';
import { MODERATION_REASONS } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import type { PathParameter, QueryParameter } from '../../http/index.js';
declare const REACTION_IDS: readonly ["applause", "heart", "bravo", "laugh", "wow", "sad"];
export declare const ChatMessageIdParameter: PathParameter<'messageId', z.ZodString>;
export declare const ChatSinceSeqParameter: QueryParameter<'sinceSeq', z.ZodNumber>;
export declare const SendChatMessageBodySchema: z.ZodObject<{
    text: z.ZodString;
    atMediaSec: z.ZodInt;
}, z.core.$strip>;
export declare const SendReactionBodySchema: z.ZodObject<{
    reactionId: VocabularyIn<typeof REACTION_IDS>;
    atMediaSec: z.ZodInt;
}, z.core.$strip>;
export declare const ReportChatMessageBodySchema: z.ZodObject<{
    reason: VocabularyIn<typeof MODERATION_REASONS>;
}, z.core.$strip>;
export type SendChatMessageBody = z.output<typeof SendChatMessageBodySchema>;
export type SendReactionBody = z.output<typeof SendReactionBodySchema>;
export type ReportChatMessageBody = z.output<typeof ReportChatMessageBodySchema>;
export {};
//# sourceMappingURL=schemas.d.ts.map