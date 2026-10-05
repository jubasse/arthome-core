import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const replaysDocs: ModuleDocs = {
  listReplays: {
    description:
      '**This is a discovery page, not "My replays".** The distinction is not cosmetic: "Replays"\nis a permanent entry in a television\'s sidebar, exactly like "Live" or "Categories", and it\nis not prefixed "My" — unlike "My seats" and "My list", which are. Its content is the\ncatalogue of replays **on sale or included**, including ones never watched: that is the\nwhole point of it.\n\nThree reasons the existing paths were no substitute: `/v1/me/replays` returns what one\n**holds** and answers `401` to a visitor — yet on a television the sidebar is always there,\nand hiding an entry based on the session makes the menu change size under the focus, which\nbreaks focus memory; `/v1/search?tab=replays` requires `q` of at least two characters, so\nit has no empty search; and its paginated unit is the **show**, whereas a replay window\nexpires **per date** — grouping by show makes the "expiring first" sort inexpressible.\n\n**Public read**, like the nine other catalogue operations.\n',
    upstream: [Service.CATALOG, Service.TICKETING, Service.STREAMING],
  },
};
