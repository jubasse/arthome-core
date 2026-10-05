import { ApiErrorCode } from '@arthome/core';

import {
  DateAvailabilitySchema,
  QuoteSeatBodySchema,
  WaitlistDepartureSchema,
  WaitlistRegistrationSchema,
} from './schemas.js';
import type {
  EnterSalesQueueRoute,
  GetDateDetailRoute,
  GetSalesQueuePositionRoute,
  JoinWaitlistRoute,
  LeaveWaitlistRoute,
  QuoteSeatRoute,
  RefreshDateAvailabilityRoute,
} from './types.js';
import { DateDetailSchema } from '../../catalog/index.js';
import { Freshness, cache, throttle } from '../../http/index.js';
import { SalesQueuePositionSchema, SeatQuoteSchema } from '../../ticketing/index.js';
import {
  DateIdParameter,
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  storefrontV1,
  viewer,
} from '../components.js';

const PUBLIC_VARY = ['Cookie', 'Authorization', 'X-Arthome-Device-Token', 'X-Arthome-Surface'];

const identified = storefrontV1.identity(viewer).headers(SurfaceParameter, TraceparentParameter);
const anonymousAllowed = identified.optionalAuth();

const publicDates = anonymousAllowed.tags(StorefrontTag.DATE).resource('dates', {
  id: DateIdParameter,
});
const dates = identified.tags(StorefrontTag.COMMERCE).resource('dates', { id: DateIdParameter });
const publicCommerceDates = anonymousAllowed
  .tags(StorefrontTag.COMMERCE)
  .resource('dates', { id: DateIdParameter });

export const getDateDetail: GetDateDetailRoute = publicDates.find({
  operationId: 'getDateDetail',
  summary: "A date's page — series, suggestions, shop, prices, in the same response.",
  degradable: ['viewerProgress'] as const,
  cache: cache(Freshness.MINUTE, { etag: true, scope: 'public', vary: PUBLIC_VARY }),
  item: DateDetailSchema,
  answer: 'The page.',
});

export const refreshDateAvailability: RefreshDateAvailabilityRoute = publicCommerceDates
  .single('availability')
  .find({
    operationId: 'refreshDateAvailability',
    summary: 'Refreshes capacity and prices before showing a total.',
    cache: cache(Freshness.FIFTEEN_SECONDS, { scope: 'public', vary: PUBLIC_VARY }),
    item: DateAvailabilitySchema,
    answer: 'Capacity and prices at the instant of serving.',
    errors: [ApiErrorCode.NOT_FOUND],
  });

export const quoteSeat: QuoteSeatRoute = dates.action('seat-quote', {
  operationId: 'quoteSeat',
  summary: 'The purchase summary, composed server-side.',
  idempotent: false,
  body: QuoteSeatBodySchema,
  response: SeatQuoteSchema,
  answer: 'Devis.',
  errors: [ApiErrorCode.NOT_FOUND],
});

const polledDates = identified
  .tags(StorefrontTag.COMMERCE)
  .requires(throttle('sales-queue'))
  .resource('dates', { id: DateIdParameter });
const salesQueue = dates.single('sales-queue', { owner: 'caller' });

export const enterSalesQueue: EnterSalesQueueRoute = salesQueue.action('enter', {
  operationId: 'enterSalesQueue',
  summary: "Enters a date's sales queue.",
  idempotent: false,
  response: SalesQueuePositionSchema,
  answer: "The caller's entry, as `getSalesQueuePosition` serves it.",
  errors: [ApiErrorCode.NOT_FOUND],
});

export const getSalesQueuePosition: GetSalesQueuePositionRoute = polledDates
  .single('sales-queue', { owner: 'caller' })
  .find({
    operationId: 'getSalesQueuePosition',
    summary: "Reads one's place in a date's sales queue, and the admission once it comes.",
    cache: cache(Freshness.NEVER),
    item: SalesQueuePositionSchema,
    answer: "The caller's entry.",
    errors: [ApiErrorCode.NOT_FOUND],
  });

const waitlist = dates.single('waitlist', { owner: 'caller' });

export const joinWaitlist: JoinWaitlistRoute = waitlist.upsert({
  operationId: 'joinWaitlist',
  summary: "S'inscrit en liste d'attente.",
  item: WaitlistRegistrationSchema,
  answer: 'Inscrit.',
  errors: [ApiErrorCode.NOT_FOUND],
});

export const leaveWaitlist: LeaveWaitlistRoute = waitlist.delete({
  operationId: 'leaveWaitlist',
  summary: 'Leaves the waiting list.',
  response: WaitlistDepartureSchema,
  answer:
    'Removed. A deletion replayed on an already-removed registration **succeeds**, it does not fail.',
  errors: [ApiErrorCode.NOT_FOUND],
});
