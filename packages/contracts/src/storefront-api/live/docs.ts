import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const liveDocs: ModuleDocs = {
  getLiveScreen: {
    description:
      "**One call**, and the hourly grouping is **server-side**: it depends on the viewer's\ntimezone, which the surface sends in a header. Grouped client-side it would be grouped five\ndifferent ways, and Next's server rendering does not know the visitor's timezone.\n\n**Public read.** Called **with no authentication at all**, this operation returns the\n**public body** — identical for every anonymous caller, hence shareable in a common\ncache. The three per-viewer overlays (`watchVerdict`, `viewerRelations`,\n`viewerProgress`) are then **absent**, never null. Called with a session or a bearer\ntoken, it returns the public body **plus** the overlays, and becomes private.\n",
    upstream: [Service.CATALOG, Service.TICKETING, Service.STREAMING, Service.IDENTITY],
  },
};
