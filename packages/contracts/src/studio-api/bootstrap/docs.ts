import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const bootstrapDocs: ModuleDocs = {
  getStudioBootstrap: {
    description:
      '**One call**, and nothing is painted until it is there: the person, **all** their channels\nwith their effective roles, `grants` **projected onto those roles**, the preferences, the\nrights version, the badge counters and the domain constants.\n\n**The root is a person, not a channel.** A freelance stage manager can be on duty for two\nlive shows the same evening, at two different channels.\n\nThe failure of this call is **a failure screen in its own right, with the trace identifier**:\nit is the only moment left where the person can still read out a number and dictate it to\nsupport.\n',
    upstream: [Service.IDENTITY],
  },
};
