import type { z } from 'zod';

import { DisplayState, PriceTier, ReplayPolicy, RightsScope, SeatState } from '@arthome/core';

import { ArtistSummarySchema, DateCardSchema } from '../catalog/index.js';
import { Acknowledged, Deleted, ReauthProof } from '../http/index.js';
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
];
