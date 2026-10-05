import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const artistsDocs: ModuleDocs = {
  listArtists: {
    description:
      'Two sorts only, and they are **served**: alphabetical and by follower count. The follower\ncount comes from **a single projection**, so that it never differs between the artist page\nand the list.\n\n**Public read.** Called **with no authentication at all**, this operation returns the\n**public body** — identical for every anonymous caller, hence shareable in a common\ncache. The three per-viewer overlays (`watchVerdict`, `viewerRelations`,\n`viewerProgress`) are then **absent**, never null. Called with a session or a bearer\ntoken, it returns the public body **plus** the overlays, and becomes private.\n',
    upstream: [Service.CATALOG, Service.IDENTITY],
  },
  getArtistDetail: {
    description:
      '**One call**: the page, upcoming dates, past dates, replays and the shop in the same\nresponse. A page served in four calls would paint in four stages, which a screen three\nmetres away makes unreadable.\n\n**Public read.** Called **with no authentication at all**, this operation returns the\n**public body** — identical for every anonymous caller, hence shareable in a common\ncache. The three per-viewer overlays (`watchVerdict`, `viewerRelations`,\n`viewerProgress`) are then **absent**, never null. Called with a session or a bearer\ntoken, it returns the public body **plus** the overlays, and becomes private.\n',
    upstream: [Service.CATALOG, Service.TICKETING, Service.IDENTITY, Service.STREAMING],
  },
};
