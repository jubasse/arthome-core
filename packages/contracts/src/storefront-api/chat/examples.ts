import type { z } from 'zod';

import { Locale, MessageState, ModerationReason } from '@arthome/core';

import type { ReportChatMessageBody, SendChatMessageBody, SendReactionBody } from './schemas.js';
import {
  ReportChatMessageBodySchema,
  SendChatMessageBodySchema,
  SendReactionBodySchema,
} from './schemas.js';
import { ChatMessageSchema, ReactionQuotaSchema } from '../../engagement/index.js';
import type { ModuleExamples } from '../../openapi/docs.js';

const chatMessage: z.output<typeof ChatMessageSchema> = {
  id: '019928f8-0000-7000-8000-000000000001',
  dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
  seq: 41287,
  authorHandle: '@marie.j',
  atMediaSec: 2160,
  sentAt: '2026-09-21T19:35:58Z',
  badge: MessageState.PUBLISHED,
  body: { contentLanguage: Locale.FR, text: 'Quelle lumière.' },
};

const reactionQuota: z.output<typeof ReactionQuotaSchema> = {
  remaining: 17,
  rechargesAt: '2026-09-21T19:41:05Z',
};

const sendChatMessageBody: SendChatMessageBody = { text: 'Quelle lumière.', atMediaSec: 2160 };

const sendReactionBody: SendReactionBody = { reactionId: 'applause', atMediaSec: 2165 };

const reportChatMessageBody: ReportChatMessageBody = { reason: ModerationReason.HARASSMENT };

export const chatExamples: ModuleExamples = [
  [ChatMessageSchema, [chatMessage]],
  [ReactionQuotaSchema, [reactionQuota]],
  [SendChatMessageBodySchema, [sendChatMessageBody]],
  [SendReactionBodySchema, [sendReactionBody]],
  [ReportChatMessageBodySchema, [reportChatMessageBody]],
];
