import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const uploadsDocs: ModuleDocs = {
  createUploadTicket: {
    description:
      "**Never `multipart` from a WebView.** A JSON command returns a signed upload URL, valid for\n**15 minutes** — long enough for a room's 4G, short enough not to be an access token in\ndisguise.\n",
    upstream: [Service.CATALOG],
  },
};
