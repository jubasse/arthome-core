import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const homeDocs: ModuleDocs = {
  getHomeScreen: {
    description:
      '**One call.** Ten to thirteen rails, six to eight visible cards each, a cursor per rail:\n60 to 100 cards, on the order of 50 to 90 KB raw, under 15 KB once compressed.\n\nThe BFF composes this model with **three per-viewer overlays, batched by id lists** — never\none call per card. In steady state, the per-profile Redis cache (30 s TTL) brings the screen\ndown to one or two internal calls.\n\n**Public read.** Called **with no authentication at all**, this operation returns the\n**public body** — identical for every anonymous caller, hence shareable in a common cache.\nThe three per-viewer overlays (`watchVerdict`, `viewerRelations`, `viewerProgress`) are then\n**absent**, never null. Called with a session or a bearer token, it returns the public body\n**plus** the overlays, and becomes private.\n',
    upstream: [Service.CATALOG, Service.TICKETING, Service.IDENTITY, Service.STREAMING],
  },
};
