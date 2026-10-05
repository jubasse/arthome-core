import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const chatDocs: ModuleDocs = {
  reportChatMessage: {
    description:
      'A report creates a **queue row** (`reported`), not a sanction. The three axes never stack.',
    upstream: [Service.CHAT],
  },
};
