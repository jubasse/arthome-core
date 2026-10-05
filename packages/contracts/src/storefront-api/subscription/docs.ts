import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const subscriptionDocs: ModuleDocs = {
  setSubscriptionPlan: {
    description:
      '**A state assignment**, not a toggle. The effect is **immediately visible** on displayed\nprices: `x-arthome-invalidates` names the reads that become false, so the surface\ninvalidates exactly what it must. The **right to watch**, on the other hand, is never\ndecided here: it is returned by `streaming` when the player opens, on fresh data.\n',
    upstream: [Service.TICKETING],
  },
  cancelSubscription: {
    description:
      'Cancellation takes effect **at the end of the period**: the rights run until\n`currentPeriodEnd`, and the contract serves it as an **instant** rather than letting five\nsurfaces compute "12 days left".\n',
    upstream: [Service.TICKETING],
  },
};
