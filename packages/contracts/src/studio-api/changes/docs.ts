import { Upstream } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const changesDocs: ModuleDocs = {
  listStudioChanges: {
    description:
      'The mechanism was **written, argued, specified** — and wired to the storefront BFF only. The\nstudio has the same need, on the surface one leaves open for two hours while a colleague edits\nthe same objects.\n\nAnd it has a reason that exists nowhere else: under Ionic\'s router, **a page stays in the DOM\nafter you leave it** and redisplays as-is on the way back. Without a cheap freshness read,\nevery return to a page is either a stale display or a full reload over a room\'s 4G.\n\n`complete: false` means "too many changes, reload everything" — the same honesty as\n`resume:too_old` on the channel.\n',
    upstream: [Upstream.REALTIME],
    maturity: 'stable',
    maturityReason: 'realtime is not a service, and the change feed is a shape the BFF owns',
  },
};
