import type { z } from 'zod';

import { DisplayState, ReplayPolicy, RightsScope } from '@arthome/core';

import { HomeScreenSchema } from '../../catalog/index.js';
import type { ModuleExamples } from '../../openapi/docs.js';

const homeScreen: z.output<typeof HomeScreenSchema> = {
  billboard: {
    previewStartsAfterSec: 4,
    date: {
      id: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
      showId: '019928a0-7d31-7a10-b8c4-2f9e11a4c111',
      channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
      slug: '2026-09-21',
      canonicalUrl: 'https://arthome.fr/show/nuit-blanche/date/2026-09-21',
      title: 'Nuit blanche',
      startsAt: '2026-09-21T19:00:00Z',
      venueClock: { venueTimezone: 'Europe/Paris', venueUtcOffsetMin: 120 },
      runtimeMin: 95,
      roomOpensAt: '2026-09-21T18:30:00Z',
      displayState: DisplayState.LIVE,
      displayStateValidUntil: '2026-09-21T20:35:00Z',
      replay: { policy: ReplayPolicy.INCLUDED, windowHours: 72 },
      rights: { scope: RightsScope.WORLDWIDE, blackoutCountries: [] },
      media: { wide: [], poster: [] },
      viewers: 1842,
    },
  },
  rails: [
    {
      id: 'resume',
      titleCode: 'home.rail.resume',
      kind: 'resume',
      itemKind: 'date',
      cardForm: 'wide',
      items: [],
      nextCursor: null,
    },
  ],
};

export const homeExamples: ModuleExamples = [[HomeScreenSchema, [homeScreen]]];
