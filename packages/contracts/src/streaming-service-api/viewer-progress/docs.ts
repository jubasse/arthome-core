import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const viewerProgressDocs: ModuleDocs = {
  getViewerProgressBatch: {
    description:
      "**The third per-viewer overlay** (`transport.md` §5.6): the storefront BFF merges the table\ninto each card's `viewerProgress` by date id, so a screen of cards costs one call, never one per\ncard. A date with no point is absent from the table.\n\nThe profile is the token's: a `profileId` other than the principal's is refused `403`\n`api.forbidden`.\n",
    upstream: [Service.STREAMING],
    idempotencyExemption:
      'A read, which writes nothing: it is a `POST` only because its ids do not fit in a query string\n(`transport.md` §5.6).\n',
  },
};
