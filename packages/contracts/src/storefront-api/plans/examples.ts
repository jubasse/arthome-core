import { NavigationEntry, PlanOpening, PlanTier } from '@arthome/core';

import type { PlanList } from './schemas.js';
import { PlanListSchema } from './schemas.js';
import type { ModuleExamples } from '../../openapi/docs.js';

const planList: PlanList = {
  servedAt: '2026-09-21T18:02:20.000Z',
  items: [
    {
      tier: PlanTier.PASS,
      price: { amountMinor: 1200, currencyCode: 'EUR' },
      opens: [
        PlanOpening.BROWSE,
        PlanOpening.TRAILERS,
        PlanOpening.FREE_DATES,
        NavigationEntry.REPLAYS,
        PlanOpening.ONE_LIVE_MONTH,
      ],
      seatDiscountBps: 1000,
      concurrentStreamsAllowed: 1,
    },
  ],
};

export const plansExamples: ModuleExamples = [[PlanListSchema, [planList]]];
