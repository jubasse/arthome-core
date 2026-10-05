import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const searchDocs: ModuleDocs = {
  search: {
    description:
      '**The paginated unit is the show** for `best`, `lives` and `replays`; the `artists` tab\npaginates artists. The "soon" sort is that of the **representative date**, and the "this\nweekend" filter applies **before** grouping.\n\nFacet counts are computed on the current query and returned **in the same response**: no\nsecond call. The total count is **approximate and bounded** — exact up to the threshold served\nas `DomainConstants.searchExactTotalLimit`, a lower bound beyond it, and `totalIsLowerBound`\nsays which of the two it is.\n\n**Budget ≤ 200 ms**: a television\'s on-screen keyboard produces one character per press and\nthe results live as you type; beyond that, the visual feedback of typing comes adrift. The\nrequest is **cancellable** — the client closes the socket, the server gives up.\n\n**Public read.** Called **with no authentication at all**, this operation returns the\n**public body** — identical for every anonymous caller, hence shareable in a common\ncache. The three per-viewer overlays (`watchVerdict`, `viewerRelations`,\n`viewerProgress`) are then **absent**, never null. Called with a session or a bearer\ntoken, it returns the public body **plus** the overlays, and becomes private.\n',
    upstream: [Service.CATALOG, Service.TICKETING, Service.IDENTITY, Service.STREAMING],
  },
};
