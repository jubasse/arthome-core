import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const exportsDocs: ModuleDocs = {
  getChannelExport: {
    description:
      'Until it is `ready`, `downloadUrl` is null: the contract never serves an address that would not answer.',
    upstream: [Service.PAYOUTS],
  },
};
