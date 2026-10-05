import { ModerationReason } from '@arthome/core';

import type { ReportChatMessageBody } from './schemas.js';
import { ReportChatMessageBodySchema } from './schemas.js';
import type { ModuleExamples } from '../../openapi/docs.js';

const reportChatMessageBody: ReportChatMessageBody = { reason: ModerationReason.HARASSMENT };

export const chatExamples: ModuleExamples = [
  [ReportChatMessageBodySchema, [reportChatMessageBody]],
];
