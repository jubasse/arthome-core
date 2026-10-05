import {
  AccountStatus,
  DisplayState,
  OrderKind,
  OrderState,
  PriceTier,
  ReplayPolicy,
  RightsScope,
} from '@arthome/core';

import type {
  CheckoutCartBody,
  MerchCheckoutAnswer,
  OrderDetail,
  PurchaseSeatBody,
  SeatPurchaseAnswer,
} from './schemas.js';
import {
  CheckoutCartBodySchema,
  MerchCheckoutAnswerSchema,
  OrderDetailSchema,
  PurchaseSeatBodySchema,
  SeatPurchaseAnswerSchema,
} from './schemas.js';
import type { ModuleExamples } from '../../openapi/docs.js';

const DATE_ID = '019928a0-7d31-7a10-b8c4-2f9e11a4c001';
const SEAT_ORDER_ID = '019928f5-0000-7000-8000-0000000000aa';

const purchaseSeatBody: PurchaseSeatBody = {
  dateId: DATE_ID,
  tier: PriceTier.FULL,
  quantity: 2,
  expectedTotal: { amountMinor: 4620, currencyCode: 'EUR' },
};

const date: SeatPurchaseAnswer['data']['date'] = {
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
  displayState: DisplayState.LIVE,
  displayStateValidUntil: '2026-09-21T20:35:00Z',
  replay: { policy: ReplayPolicy.INCLUDED, windowHours: 72 },
  rights: { scope: RightsScope.WORLDWIDE, blackoutCountries: [] },
  media: { wide: [], poster: [] },
};

const seatOrder: SeatPurchaseAnswer['data']['order'] = {
  id: SEAT_ORDER_ID,
  reference: 'ATH-2026-00042',
  kind: OrderKind.SEAT,
  state: OrderState.PAID,
  placedAt: '2026-09-21T18:41:30Z',
};

const seatPurchaseAnswer: SeatPurchaseAnswer = {
  servedAt: '2026-09-21T18:41:30.000Z',
  data: {
    tickets: [
      {
        seatId: '019928f5-0000-7000-8000-000000000001',
        dateId: DATE_ID,
        orderId: SEAT_ORDER_ID,
        seatCode: 'ATH-7QK2-4M',
        tier: PriceTier.FULL,
        state: AccountStatus.ACTIVE,
        cancelDeadline: '2026-09-21T18:00:00Z',
        date,
      },
    ],
    date,
    order: seatOrder,
  },
};

const checkoutCartBody: CheckoutCartBody = {
  quoteId: '019928f6-1111-7000-8000-000000000001',
  shippingAddress: {
    line1: '12 rue du Théâtre',
    city: 'Paris',
    postalCode: '75011',
    countryCode: 'FR',
  },
};

const merchCheckoutAnswer: MerchCheckoutAnswer = {
  servedAt: '2026-09-21T18:46:00.000Z',
  data: {
    orders: [
      {
        id: '019928f6-2222-7000-8000-000000000001',
        reference: 'ATH-2026-00043',
        kind: OrderKind.MERCH,
        state: OrderState.PAID,
        placedAt: '2026-09-21T18:46:00Z',
      },
    ],
    cart: { lines: [], vendorGroups: [] },
  },
};

const orderDetail: OrderDetail = {
  order: { ...seatOrder, invoiceAvailable: true },
  tickets: [],
};

export const ordersExamples: ModuleExamples = [
  [PurchaseSeatBodySchema, [purchaseSeatBody]],
  [SeatPurchaseAnswerSchema, [seatPurchaseAnswer]],
  [CheckoutCartBodySchema, [checkoutCartBody]],
  [MerchCheckoutAnswerSchema, [merchCheckoutAnswer]],
  [OrderDetailSchema, [orderDetail]],
];
