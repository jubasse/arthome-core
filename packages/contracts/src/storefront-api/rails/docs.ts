import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const railsDocs: ModuleDocs = {
  extendRail: {
    description:
      '`Rail.nextCursor` was served and **no operation consumed it**. A rail extends, it does not\npaginate on screen: the cursor serves to append items on the right when the focus reaches\nthe edge, not to change page.\n\nComposition and order stay **server-side** — the surface never filters the catalogue.\n\n**Public read**, like the rail whose content it continues.\n',
    upstream: [Service.CATALOG, Service.TICKETING, Service.IDENTITY, Service.STREAMING],
  },
};
