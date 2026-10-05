import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const invitationsDocs: ModuleDocs = {
  respondToInvitation: {
    description:
      "Acceptance publishes the membership **then** an increment of `rightsVersion` — that is what\nbrings the channel into the switcher **without a reload**, and what makes a lost channel's\nreal-time rooms be left without waiting for a reconnection.\n",
    upstream: [Service.IDENTITY],
  },
};
