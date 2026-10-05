import type { z } from 'zod';

import {
  BlackoutReason,
  DisplayState,
  PriceTier,
  ReplayPolicy,
  RightsScope,
  WatchDenialReason,
  WatchFallbackAction,
} from '@arthome/core';

import type {
  DateAvailability,
  QuoteSeatBody,
  WaitlistDeparture,
  WaitlistRegistration,
} from './schemas.js';
import {
  DateAvailabilitySchema,
  QuoteSeatBodySchema,
  WaitlistDepartureSchema,
  WaitlistRegistrationSchema,
} from './schemas.js';
import { DateDetailSchema } from '../../catalog/index.js';
import type { ModuleExamples } from '../../openapi/docs.js';
import { SalesQueuePositionSchema, SeatQuoteSchema } from '../../ticketing/index.js';

const DATE_ID = '019928a0-7d31-7a10-b8c4-2f9e11a4c001';

const dateDetail: z.output<typeof DateDetailSchema> = {
  id: DATE_ID,
  showId: '019928a0-7d31-7a10-b8c4-2f9e11a4c111',
  channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
  slug: '2026-09-21',
  canonicalUrl: 'https://arthome.fr/show/nuit-blanche/date/2026-09-21',
  title: 'Nuit blanche',
  startsAt: '2026-09-21T19:00:00Z',
  venueClock: { venueTimezone: 'Europe/Paris', venueUtcOffsetMin: 120 },
  runtimeMin: 95,
  displayState: DisplayState.LIVE,
  displayStateValidUntil: '2026-09-21T20:35:00Z',
  replay: { policy: ReplayPolicy.INCLUDED, windowHours: 72 },
  rights: {
    scope: RightsScope.RESTRICTED,
    blackoutCountries: ['CA'],
    blackoutReasonCode: BlackoutReason.BROADCASTER,
  },
  media: { wide: [], poster: [] },
  totalSeriesDates: 3,
  watchVerdict: {
    allowed: false,
    advisory: true,
    denialReasonCode: WatchDenialReason.NO_SEAT,
    fallbackAction: WatchFallbackAction.BUY_SEAT,
    validUntil: '2026-09-21T18:03:21.000Z',
  },
};

const dateAvailability: DateAvailability = {
  seatsAvailable: 42,
  waitlistCount: 0,
  fillRateBps: 8700,
  soldOut: false,
  priceTiers: [
    { tier: PriceTier.FULL, amount: { amountMinor: 2400, currencyCode: 'EUR' }, active: true },
  ],
  serviceFeePerSeat: { amountMinor: 150, currencyCode: 'EUR' },
};

const quoteSeatBody: QuoteSeatBody = { tier: PriceTier.FULL, quantity: 2 };

const seatQuote: z.output<typeof SeatQuoteSchema> = {
  lines: [
    { kind: 'tier', amount: { amountMinor: 4800, currencyCode: 'EUR' } },
    { kind: 'service_fee', amount: { amountMinor: 300, currencyCode: 'EUR' } },
    {
      kind: 'subscription_discount',
      discountReasonCode: 'plan_pass',
      amount: { amountMinor: -480, currencyCode: 'EUR' },
    },
  ],
  total: { amountMinor: 4620, currencyCode: 'EUR' },
  validUntil: '2026-09-21T18:42:10.000Z',
};

const salesQueuePosition: z.output<typeof SalesQueuePositionSchema> = {
  dateId: DATE_ID,
  armed: true,
  state: 'waiting',
  position: 2841,
  estimatedWaitSec: 95,
  pollIntervalSec: 2,
};

const salesQueueAdmission: z.output<typeof SalesQueuePositionSchema> = {
  dateId: DATE_ID,
  armed: true,
  state: 'admitted',
  pollIntervalSec: 5,
  admission: {
    token: 'adm_v1.eyJkIjoiMDE5OTI4YTAiLCJhIjoiMDE5OTI4ZjQifQ.3kQx',
    expiresAt: '2026-09-21T18:02:40.000Z',
  },
};

const waitlistRegistration: WaitlistRegistration = {
  joined: true,
  rankDisclosed: false,
  rank: null,
  priorityWindowHours: 2,
};

const waitlistDeparture: WaitlistDeparture = { joined: false };

export const datesExamples: ModuleExamples = [
  [DateDetailSchema, [dateDetail]],
  [DateAvailabilitySchema, [dateAvailability]],
  [QuoteSeatBodySchema, [quoteSeatBody]],
  [SeatQuoteSchema, [seatQuote]],
  [SalesQueuePositionSchema, [salesQueuePosition, salesQueueAdmission]],
  [WaitlistRegistrationSchema, [waitlistRegistration]],
  [WaitlistDepartureSchema, [waitlistDeparture]],
];
