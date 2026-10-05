import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const incidentsDocs: ModuleDocs = {
  resolveIncident: {
    description:
      'The player **lifts the veil** without asking for a new playback token: otherwise the resume\nwould be paid for with a stream reload, on media that was never cut.\n',
    upstream: [Service.STREAMING],
  },
  escalateIncidentToProduction: {
    description:
      '**What a role without `canDecideOutcome` can do.** It declares no outcome; it reports, and\nthe alert is **routed by role and by channel, server-side**. Without this gesture, the only\nrecourse of a stage manager alone in a room would be to phone someone.\n',
    upstream: [Service.NOTIFICATIONS],
  },
};
