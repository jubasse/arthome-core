import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const plansDocs: ModuleDocs = {
  listPlans: {
    description:
      'Three plans, their nine possible openings, the discount on seats and the concurrent-screen\nceiling. **The ceiling is published here and enforced by `streaming`**: it is an execution\nconstraint, not a marketing line.\n\n**Public read.** Called **with no authentication at all**, this operation returns the\n**public body** — identical for every anonymous caller, hence shareable in a common\ncache. The three per-viewer overlays (`watchVerdict`, `viewerRelations`,\n`viewerProgress`) are then **absent**, never null. Called with a session or a bearer\ntoken, it returns the public body **plus** the overlays, and becomes private.\n',
    upstream: [Service.TICKETING],
  },
};
