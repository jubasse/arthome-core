import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const inboxDocs: ModuleDocs = {
  listInbox: {
    description:
      '**Open to everyone**, whatever the role. The routing is decided **server-side**: the\napplication does not filter a common queue, otherwise it would receive alerts it has no right\nto read and would merely refrain from displaying them — which is a leak, not a rule.\n',
    upstream: [Service.NOTIFICATIONS],
  },
  markInboxRead: {
    description: '**Monotonic: nothing gets un-read.** Replayed, it changes nothing.',
    upstream: [Service.NOTIFICATIONS],
  },
};
