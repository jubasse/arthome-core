import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const bankChangeRequestsDocs: ModuleDocs = {
  countersignBankChange: {
    description:
      '**Two distinct roles**: the owner **and** the treasury. One and the same person cannot sign\nboth times, even holding both roles — `channel.same_actor_forbidden`. That is the entire point of a\ndual signature.\n',
    upstream: [Service.PAYOUTS],
  },
};
