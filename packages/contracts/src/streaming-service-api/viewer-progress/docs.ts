import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';
import { PROFILE_FROM_THE_TOKEN } from '../principal.docs.js';

export const viewerProgressDocs: ModuleDocs = {
  getViewerProgressBatch: {
    description: `**The third per-viewer overlay** (\`transport.md\` §5.6): the storefront BFF merges the table\ninto each card's \`viewerProgress\` by date id, so a screen of cards costs one call, never one per\ncard. A date with no point is absent from the table.\n\n${PROFILE_FROM_THE_TOKEN}\nRefused, the storefront BFF serves the cards without the overlay (\`degraded: ["viewerProgress"]\`,\n\`transport.md\` §5.8).\n`,
    upstream: [Service.STREAMING],
    idempotencyExemption:
      'A read, which writes nothing: it is a `POST` only because its ids do not fit in a query string\n(`transport.md` §5.6).\n',
  },
};
