import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const resolveDocs: ModuleDocs = {
  resolvePublicLink: {
    description:
      '**`slug` and `canonicalUrl` were served everywhere and accepted nowhere.** Path identifiers\nare UUIDs; all five occurrences of `slug` were on output. A notification pushed to a dead\napplication, a shared link, a bookmark, a search engine result: all of them deliver a\n**URL**, and nothing in the contract knew how to read one.\n\nThe gap went beyond mobile: `canonicalUrl` is what the television encodes in the QR code of\nthe **Share** action — on a television, sharing cannot mean copying a link, there is neither\na useful clipboard nor a messaging app.\n\n**Resolves, does not redirect.** The response names the type and the identifier, and the\nsurface decides where to go: a mobile deep link, a Next route and a television page do not\nhave the same destination for the same resource.\n\n**Public read**: a shared link opens before any sign-in.\n',
    upstream: [Service.CATALOG],
  },
};
