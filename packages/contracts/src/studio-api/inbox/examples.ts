import { Locale } from '@arthome/core';

import type { InboxReadAnswer, MarkInboxReadBody } from './schemas.js';
import { InboxReadAnswerSchema, MarkInboxReadBodySchema } from './schemas.js';
import type { ModuleExamples } from '../../openapi/docs.js';
import { InboxEntrySchema } from '../../studio-desk/index.js';

const markInboxReadBody: MarkInboxReadBody = { all: true };

const inboxReadAnswer: InboxReadAnswer = {
  servedAt: '2026-09-21T18:00:20.000Z',
  rightsVersion: 412,
  data: {
    moderationPending: 14,
    inboxUnread: 0,
    dutiesTonight: 3,
  },
};

export const inboxExamples: ModuleExamples = [
  [MarkInboxReadBodySchema, [markInboxReadBody]],
  [InboxReadAnswerSchema, [inboxReadAnswer]],
  [
    InboxEntrySchema,
    [
      {
        id: '019928b1-0000-7000-8000-000000000001',
        kind: 'invitation',
        channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
        body: {
          contentLanguage: Locale.FR,
          text: 'Compagnie Verticale vous invite comme coordination.',
        },
        deepLinkCode: 'crew_invitation',
        createdAt: '2026-09-20T14:02:00Z',
        read: false,
      },
    ],
  ],
];
