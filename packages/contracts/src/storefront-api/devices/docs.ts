import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const devicesDocs: ModuleDocs = {
  registerDevice: {
    description:
      '**Called on first launch, before any session.** Device identity is a contract notion, and\nit is required for four things the surfaces ask for: opening and polling a pairing, naming\nitself under "connected devices", being revoked, and carrying a rate limit somewhere other\nthan the IP address — which a household behind a NAT shares.\n\nIt **is not a session** and opens no personal data; in particular it does not open the\nreal-time channel.\n',
    upstream: [Service.IDENTITY],
  },
};
