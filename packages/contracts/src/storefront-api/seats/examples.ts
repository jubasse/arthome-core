import {
  DisplayState,
  PriceTier,
  RefundDelayCode,
  RefundMethod,
  RefundReason,
  ReplayPolicy,
  RightsScope,
  SeatCancelReason,
  SeatState,
} from '@arthome/core';

import type { CancelSeatBody, SeatCancellation } from './schemas.js';
import { CancelSeatBodySchema, SeatCancellationSchema } from './schemas.js';
import type { ModuleExamples } from '../../openapi/docs.js';

const cancelSeatBody: CancelSeatBody = { cancelReasonCode: SeatCancelReason.VIEWER_REQUEST };

const DATE_ID = '019928a0-7d31-7a10-b8c4-2f9e11a4c001';

const date: NonNullable<SeatCancellation['date']> = {
  id: DATE_ID,
  showId: '019928a0-7d31-7a10-b8c4-2f9e11a4c111',
  channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
  slug: '2026-09-21',
  canonicalUrl: 'https://arthome.fr/show/nuit-blanche/date/2026-09-21',
  title: 'Nuit blanche',
  startsAt: '2026-09-21T19:00:00Z',
  venueClock: { venueTimezone: 'Europe/Paris', venueUtcOffsetMin: 120 },
  runtimeMin: 95,
  roomOpensAt: '2026-09-21T18:30:00Z',
  displayState: DisplayState.SCHEDULED,
  displayStateValidUntil: '2026-09-21T18:30:00Z',
  replay: { policy: ReplayPolicy.INCLUDED, windowHours: 72 },
  rights: { scope: RightsScope.WORLDWIDE, blackoutCountries: [] },
  media: { wide: [], poster: [] },
};

const seatCancellation: SeatCancellation = {
  ticket: {
    seatId: '019928f5-0000-7000-8000-000000000001',
    dateId: DATE_ID,
    seatCode: 'ATH-7QK2-4M',
    tier: PriceTier.FULL,
    state: SeatState.CANCELLED,
    date,
    refund: {
      amount: { amountMinor: 2400, currencyCode: 'EUR' },
      delayCode: RefundDelayCode.BUSINESS_DAYS_3_5,
      method: RefundMethod.ORIGINAL_PAYMENT_METHOD,
      refundReasonCode: RefundReason.VIEWER_REQUEST,
    },
  },
  date,
};

export const seatsExamples: ModuleExamples = [
  [CancelSeatBodySchema, [cancelSeatBody]],
  [SeatCancellationSchema, [seatCancellation]],
];
