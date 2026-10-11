import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const mediaServerDocs: ModuleDocs = {
  authorizeMediaServerAccess: {
    description:
      "**MediaMTX's external HTTP authentication** (`authMethod: http`), called before the origin\naccepts a feed. The body is MediaMTX's own; MediaMTX accepts any `2xx` and reads no body, so\nan acceptance is a `204`. Only a `publish` is accepted: the origin sends no read, viewers\nreading on an edge instance that checks its own token.\n\n`401` means the shared secret was missing or wrong: a misconfiguration to alarm on, never a\nfeed refused. `403` is the attempt refused, by the run it names: its stream key, its state, a\npublisher already online. The reason of a refusal is logged by the service and never answered.\n",
    upstream: [Service.STREAMING],
    idempotencyExemption:
      'A decision, which writes nothing: the same attempt asked twice is decided twice, on the state\nof the run at that moment.\n',
  },
};
