import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const dateAccessGrantsDocs: ModuleDocs = {
  revokeDateAccess: {
    description:
      "The server makes the client **leave this date's real-time rooms** without waiting for a\nreconnection: that is what stops someone whose access expired at curtain-down from carrying on\nwatching a queue.\n",
    upstream: [Service.IDENTITY],
  },
};
