import type { z } from 'zod';

import {
  AccountStatus,
  DisplayState,
  Locale,
  MessageDomain,
  PlanTier,
  PriceTier,
  RefundDelayCode,
  ReplayPolicy,
  RightsScope,
  SeatState,
} from '@arthome/core';

import { ArtistSummarySchema, DateCardSchema } from '../catalog/index.js';
import { Acknowledged, Deleted, ReauthProof } from '../http/index.js';
import { ViewerContextSchema } from '../identity/index.js';
import type { ModuleExamples } from '../openapi/docs.js';
import { TicketCardSchema } from '../ticketing/index.js';

const dateCard: z.output<typeof DateCardSchema> = {
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
  viewerRelations: { inWatchlist: true, reminderSet: false, followsArtist: false },
};

const ticketCard: z.output<typeof TicketCardSchema> = {
  seatId: '019928e6-0000-7000-8000-000000000001',
  dateId: dateCard.id,
  orderId: '019928e5-0000-7000-8000-000000000001',
  seatCode: 'ATH-7QK2-4M',
  tier: PriceTier.FULL,
  state: SeatState.ACTIVE,
  date: dateCard,
};

const artistSummary: z.output<typeof ArtistSummarySchema> = {
  id: '019928a0-7d31-7a10-b8c4-2f9e11a4c333',
  channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
  name: 'Compagnie Verticale',
  categoryId: 'dance-contemporary',
  followedByViewer: true,
  followers: 4120,
  isLiveNow: true,
  alertEnabled: true,
};

const viewerContext: z.output<typeof ViewerContextSchema> = {
  deviceId: '019928f4-1b6c-7c3a-9f2e-6a1d0c4b8e77',
  signedIn: true,
  currentProfileId: '019928f4-2a11-7000-8000-000000000001',
  profiles: [
    {
      id: '019928f4-2a11-7000-8000-000000000001',
      name: 'Marie',
      kind: 'adult',
    },
  ],
  plan: {
    tier: PlanTier.PASS,
    state: AccountStatus.ACTIVE,
    seatDiscountBps: 1000,
    concurrentStreamsAllowed: 1,
  },
  constants: {
    roomOpensMinutesBefore: 30,
    cancelDeadlineMinutesBefore: 60,
    scarcityThresholdBps: 8500,
    billboardPreviewDelaySec: 4,
    waitlistPriorityWindowHours: 2,
    chatRateLimitPerSecond: 2,
    chatCatchUpMessages: 20,
    reminderLeadMinutes: 30,
    replayExpiryWarningHours: 6,
    previewSecondsTotal: 300,
    searchExactTotalLimit: 10000,
    creditDelayCode: RefundDelayCode.BUSINESS_DAYS_3_5,
  },
  labelCatalog: {
    domain: MessageDomain.STOREFRONT,
    locale: Locale.FR,
    version: 41,
    url: 'https://cdn.arthome.fr/i18n/storefront/fr/v41.json',
  },
  taxonomyArtifact: {
    domain: MessageDomain.TAXONOMY,
    locale: Locale.FR,
    version: 12,
    url: 'https://cdn.arthome.fr/taxonomy/fr/v12.json',
  },
  realtime: {
    namespace: '/storefront',
    pulseIntervalSec: 5,
  },
};

/**
 * The examples of the schemas several modules answer: the factories of `./http`, and the records
 * of a subpath more than one module shows. A schema is registered once per api.
 */
export const sharedExamples: ModuleExamples = [
  [Deleted, [{ deleted: true }]],
  [Acknowledged, [{ accepted: true }]],
  [ReauthProof, [{ reauthToken: 'ott_9f2ac1' }]],
  [DateCardSchema, [dateCard]],
  [TicketCardSchema, [ticketCard]],
  [ArtistSummarySchema, [artistSummary]],
  [ViewerContextSchema, [viewerContext]],
];
