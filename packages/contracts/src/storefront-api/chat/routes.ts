import { ApiErrorCode } from '@arthome/core';

import { ChatMessageIdParameter, ReportChatMessageBodySchema } from './schemas.js';
import type { ReportChatMessageRoute } from './types.js';
import {
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
