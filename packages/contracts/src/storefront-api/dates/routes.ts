import { ApiErrorCode, ChatErrorCode, OrderErrorCode } from '@arthome/core';

import {
  DateAvailabilitySchema,
  QuoteSeatBodySchema,
  SendChatMessageBodySchema,
  SendReactionBodySchema,
  SinceSeqParameter,
  WaitlistDepartureSchema,
  WaitlistRegistrationSchema,
} from './schemas.js';
import type {
  EnterSalesQueueRoute,
  GetDateDetailRoute,
  GetSalesQueuePositionRoute,
  JoinWaitlistRoute,
  LeaveWaitlistRoute,
  ListChatMessagesRoute,
  QuoteSeatRoute,
  RefreshDateAvailabilityRoute,
  SendChatMessageRoute,
  SendReactionRoute,
} from './types.js';
import { DateDetailSchema } from '../../catalog/index.js';
import { ChatMessageSchema, ReactionQuotaSchema } from '../../engagement/index.js';
import { Freshness, cache, cursor, throttle } from '../../http/index.js';
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
  errors: [
    ApiErrorCode.NOT_FOUND,
    OrderErrorCode.SALES_CLOSED,
    OrderErrorCode.CONTRIBUTION_OUT_OF_RANGE,
    OrderErrorCode.TIER_UNAVAILABLE,
  ],
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

const chat = identified
  .tags(StorefrontTag.CHAT)
  .resource('dates', { id: DateIdParameter })
  .single('chat');
const chatMessages = chat.single('messages');

export const listChatMessages: ListChatMessagesRoute = chatMessages.findAll({
  operationId: 'listChatMessages',
  summary: "The chat's sliding window, by cursor.",
  paging: cursor({ maxLimit: 50 }),
  parameters: [SinceSeqParameter],
  item: ChatMessageSchema,
  answer: 'Messages.',
  errors: [ApiErrorCode.NOT_FOUND],
});

export const sendChatMessage: SendChatMessageRoute = chatMessages.create({
  operationId: 'sendChatMessage',
  summary: 'Posts a chat message.',
  body: SendChatMessageBodySchema,
  item: ChatMessageSchema,
  answer: 'Message posted.',
  errors: [ChatErrorCode.HOLDERS_ONLY, ChatErrorCode.RATE_LIMITED],
});

export const sendReaction: SendReactionRoute = chat.action('reactions', {
  operationId: 'sendReaction',
  summary: 'Sends a reaction, and returns the remaining quota.',
  idempotent: false,
  body: SendReactionBodySchema,
  response: ReactionQuotaSchema,
  answer: 'Reaction accepted, remaining quota.',
  errors: [ChatErrorCode.RATE_LIMITED],
});
