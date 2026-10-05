import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const categoriesDocs: ModuleDocs = {
  listCategories: {
    description:
      '**One call, not one per tile.** The editorial rank is authoritative and **no surface\nreorders**. The full taxonomy is not here: it is an **immutable versioned artefact** served\nby the CDN, referenced in `ViewerContext`.\n\n**Public read.** Called **with no authentication at all**, this operation returns the\n**public body** — identical for every anonymous caller, hence shareable in a common\ncache. The three per-viewer overlays (`watchVerdict`, `viewerRelations`,\n`viewerProgress`) are then **absent**, never null. Called with a session or a bearer\ntoken, it returns the public body **plus** the overlays, and becomes private.\n',
    upstream: [Service.CATALOG],
  },
  getCategoryScreen: {
    description:
      '**One call.** The overview **does not paginate**: it is bounded (8 per section). The four\nother sections each carry their own cursor.\n\n**Public read.** Called **with no authentication at all**, this operation returns the\n**public body** — identical for every anonymous caller, hence shareable in a common\ncache. The three per-viewer overlays (`watchVerdict`, `viewerRelations`,\n`viewerProgress`) are then **absent**, never null. Called with a session or a bearer\ntoken, it returns the public body **plus** the overlays, and becomes private.\n',
    upstream: [Service.CATALOG, Service.TICKETING, Service.IDENTITY, Service.STREAMING],
  },
};
