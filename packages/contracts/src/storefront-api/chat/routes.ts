import { ApiErrorCode, ChatErrorCode } from '@arthome/core';

import {
  ChatMessageIdParameter,
  ChatSinceSeqParameter,
  ReportChatMessageBodySchema,
  SendChatMessageBodySchema,
  SendReactionBodySchema,
} from './schemas.js';
import type {
  ListChatMessagesRoute,
  ReportChatMessageRoute,
  SendChatMessageRoute,
  SendReactionRoute,
} from './types.js';
import { ChatMessageSchema, ReactionQuotaSchema } from '../../engagement/index.js';
import { cursor, throttle } from '../../http/index.js';
import {
  DateIdParameter,
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  storefrontV1,
  viewer,
} from '../components.js';

const chat = storefrontV1
  .identity(viewer)
  .headers(SurfaceParameter, TraceparentParameter)
  .tags(StorefrontTag.CHAT);
const chatDate = chat.resource('dates', { id: DateIdParameter });
const messages = chatDate.path('chat').resource('messages', { id: ChatMessageIdParameter });

export const listChatMessages: ListChatMessagesRoute = messages.findAll({
  operationId: 'listChatMessages',
  summary: "The chat's sliding window, by cursor.",
  paging: cursor({ maxLimit: 50 }),
  parameters: [ChatSinceSeqParameter],
  item: ChatMessageSchema,
  answer: 'Messages.',
  errors: [ApiErrorCode.NOT_FOUND],
});

export const sendChatMessage: SendChatMessageRoute = messages.create({
  operationId: 'sendChatMessage',
  summary: 'Posts a chat message.',
  body: SendChatMessageBodySchema,
  item: ChatMessageSchema,
  requires: [throttle('chat_message')],
  answer: 'Message posted.',
  errors: [ChatErrorCode.HOLDERS_ONLY],
});

export const sendReaction: SendReactionRoute = chatDate.action('chat/reactions', {
  operationId: 'sendReaction',
  summary: 'Sends a reaction, and returns the remaining quota.',
  body: SendReactionBodySchema,
  response: ReactionQuotaSchema,
  requires: [throttle('chat_reaction')],
  idempotent: false,
  answer: 'Reaction accepted, remaining quota.',
});

export const reportChatMessage: ReportChatMessageRoute = chat
  .path('chat')
  .resource('messages', { id: ChatMessageIdParameter })
  .action('report', {
    operationId: 'reportChatMessage',
    summary: 'Reports a message to moderation.',
    body: ReportChatMessageBodySchema,
    status: 202,
    answer: 'Report recorded. A second report from the same account does not create another.',
    errors: [ApiErrorCode.NOT_FOUND],
  });
