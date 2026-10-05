import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const supportDocs: ModuleDocs = {
  contactSupport: {
    description:
      '**The topic routes, the context prioritises.** "Requests related to a live show in progress\nare handled first": without attached context — date, seat, order — that prioritisation is\nimpossible to honour, and the copy promises something the system cannot do.\n',
    upstream: [Service.NOTIFICATIONS],
  },
};
