import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const accountDeepLinkDocs: ModuleDocs = {
  getAccountDeepLink: {
    description:
      '**Nothing is waiting, the screen does not switch, no pairing row is opened.** Two distinct\nshapes in the contract, separated by **name** and not by an option — otherwise someone will\nimplement a wait where there is none.\n',
    upstream: [Service.IDENTITY],
  },
};
