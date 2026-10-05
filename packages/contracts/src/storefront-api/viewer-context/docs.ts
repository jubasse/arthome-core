import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const viewerContextDocs: ModuleDocs = {
  getViewerContext: {
    description:
      '**A single call.** Device profiles, rights, preferences, domain constants, version of the\nlabel catalogue and of the taxonomy. The labels themselves come from the snapshot embedded\nat build time: the version check **never blocks** the first render.\n\nIf this call fails, the surface must still display a **readable** message — not a raw code,\nnot a blank screen. That is what makes the embedded snapshot mandatory rather than merely\ndesirable.\n',
    upstream: [Service.IDENTITY],
  },
};
