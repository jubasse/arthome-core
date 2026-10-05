import { OrderErrorCode } from '@arthome/core';

import {
  CheckoutCartBodySchema,
  MerchCheckoutAnswerSchema,
  OrderDetailSchema,
  OrderIdParameter,
  PurchaseSeatBodySchema,
  SeatPurchaseAnswerSchema,
} from './schemas.js';
import type { CheckoutCartRoute, GetOrderRoute, PurchaseSeatRoute } from './types.js';
import { Freshness, cache } from '../../http/index.js';
import {
  AdmissionTokenParameter,
  LateEntryAcknowledgedParameter,
  ServedAtHeader,
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  storefrontV1,
  viewer,
} from '../components.js';
import { PaymentHandoffAnswerSchema } from '../subscription/schemas.js';

const orders = storefrontV1
  .identity(viewer)
  .tags(StorefrontTag.COMMERCE)
  .headers(SurfaceParameter, TraceparentParameter)
  .resource('orders', { id: OrderIdParameter, owner: 'caller' });

export const purchaseSeat: PurchaseSeatRoute = orders.collectionAction('seats', {
  operationId: 'purchaseSeat',
  summary: 'Buys one or more seats.',
  'x-arthome-invalidates': ['account:tickets', 'date:{dateId}:availability'],
  parameters: [AdmissionTokenParameter, LateEntryAcknowledgedParameter],
  body: PurchaseSeatBodySchema,
  responses: {
    201: {
      description: 'Seats created, and the updated date.',
      headers: { 'X-Arthome-Served-At': ServedAtHeader },
      content: { 'application/json': { schema: SeatPurchaseAnswerSchema } },
    },
    202: {
      description:
        '**Strong authentication required** — the order exists, the payment is not complete. The\nsurface presents the payment element with the `clientSecret`, then follows the state through\n`getOrder`. It **never** concludes from the return URL.\n',
      content: { 'application/json': { schema: PaymentHandoffAnswerSchema } },
    },
  },
  errors: [
    OrderErrorCode.PRICE_STALE,
    OrderErrorCode.SOLD_OUT,
    OrderErrorCode.SALES_CLOSED,
    OrderErrorCode.LATE_ENTRY_UNACKNOWLEDGED,
    OrderErrorCode.CONTRIBUTION_OUT_OF_RANGE,
    OrderErrorCode.TIER_UNAVAILABLE,
    OrderErrorCode.SALES_QUEUE_ADMISSION_REQUIRED,
    OrderErrorCode.PAYMENT_DECLINED,
  ],
});

export const checkoutCart: CheckoutCartRoute = orders.collectionAction('merch', {
  operationId: 'checkoutCart',
  summary: 'Pays for the cart — one order per vendor.',
  'x-arthome-invalidates': ['account:orders', 'account:cart'],
  body: CheckoutCartBodySchema,
  responses: {
    201: {
      description: 'One order per vendor.',
      content: { 'application/json': { schema: MerchCheckoutAnswerSchema } },
    },
    202: {
      description:
        '**Strong authentication required.** See `PaymentHandoff` — the return URL concludes nothing, `getOrder` is authoritative.',
      content: { 'application/json': { schema: PaymentHandoffAnswerSchema } },
    },
  },
  errors: [
    OrderErrorCode.CHECKOUT_LINE_UNAVAILABLE,
    OrderErrorCode.QUOTE_ADDRESS_MISMATCH,
    OrderErrorCode.PRICE_STALE,
    OrderErrorCode.PAYMENT_DECLINED,
  ],
});

export const getOrder: GetOrderRoute = orders.find({
  operationId: 'getOrder',
  summary: 'The state of an order — **the only source of truth after a payment**.',
  cache: cache(Freshness.NEVER),
  item: OrderDetailSchema,
  answer: 'The order, and what it produced once it is `paid`.',
});
