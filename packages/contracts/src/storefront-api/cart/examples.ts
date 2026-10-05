import type { z } from 'zod';

import type { AddCartLineBody, CartAnswer, QuoteCartBody, UpdateCartLineBody } from './schemas.js';
import {
  AddCartLineBodySchema,
  CartAnswerSchema,
  QuoteCartBodySchema,
  UpdateCartLineBodySchema,
} from './schemas.js';
import type { ModuleExamples } from '../../openapi/docs.js';
import { CartQuoteSchema, CartSchema } from '../../ticketing/index.js';

const CHANNEL_ID = '019928a0-7d31-7a10-b8c4-2f9e11a4c222';
const LINE_ID = '019928f6-0000-7000-8000-000000000001';

const addCartLineBody: AddCartLineBody = {
  itemId: '019928a0-7d31-7a10-b8c4-2f9e11a4d001',
  variantId: 'M',
  quantity: 1,
};

const updateCartLineBody: UpdateCartLineBody = { quantity: 2 };

const quoteCartBody: QuoteCartBody = { shippingCountryCode: 'FR', shippingPostalCode: '75011' };

const cart: z.output<typeof CartSchema> = {
  lines: [
    {
      id: LINE_ID,
      itemId: addCartLineBody.itemId,
      variantId: addCartLineBody.variantId,
      channelId: CHANNEL_ID,
      quantity: 1,
      unitPrice: { amountMinor: 2500, currencyCode: 'EUR' },
      version: 1,
    },
  ],
  vendorGroups: [{ channelId: CHANNEL_ID, lineIds: [LINE_ID] }],
};

const cartAnswer: CartAnswer = { servedAt: '2026-09-21T18:44:40.000Z', data: cart };

const cartQuote: z.output<typeof CartQuoteSchema> = {
  validUntil: '2026-09-21T19:00:20.000Z',
  groups: [
    {
      channelId: CHANNEL_ID,
      subtotal: { amountMinor: 5000, currencyCode: 'EUR' },
      shipping: { amountMinor: 590, currencyCode: 'EUR' },
      discount: {
        discountReasonCode: 'plan_shop_discount',
        amount: { amountMinor: -750, currencyCode: 'EUR' },
      },
      total: { amountMinor: 4840, currencyCode: 'EUR' },
    },
  ],
};

export const cartExamples: ModuleExamples = [
  [AddCartLineBodySchema, [addCartLineBody]],
  [UpdateCartLineBodySchema, [updateCartLineBody]],
  [QuoteCartBodySchema, [quoteCartBody]],
  [CartSchema, [cart]],
  [CartAnswerSchema, [cartAnswer]],
  [CartQuoteSchema, [cartQuote]],
];
