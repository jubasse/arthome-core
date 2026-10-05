import { ApiErrorCode } from '@arthome/core';

import {
  AddCartLineBodySchema,
  CartAnswerSchema,
  CartLineIdParameter,
  QuoteCartBodySchema,
  UpdateCartLineBodySchema,
} from './schemas.js';
import type {
  AddCartLineRoute,
  GetCartRoute,
  QuoteCartRoute,
  RemoveCartLineRoute,
  UpdateCartLineRoute,
} from './types.js';
import { CartQuoteSchema, CartSchema } from '../../ticketing/index.js';
import {
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  storefrontV1,
  viewer,
} from '../components.js';

const cart = storefrontV1
  .identity(viewer)
  .tags(StorefrontTag.COMMERCE)
  .headers(SurfaceParameter, TraceparentParameter)
  .single('cart', { owner: 'caller' });

export const getCart: GetCartRoute = cart.find({
  operationId: 'getCart',
  summary: "The account's cart, split by vendor.",
  item: CartSchema,
  answer: 'The cart.',
});

export const quoteCart: QuoteCartRoute = cart.action('quote', {
  operationId: 'quoteCart',
  summary: "The cart's binding quote, per vendor.",
  idempotent: false,
  body: QuoteCartBodySchema,
  response: CartQuoteSchema,
  answer: 'Devis.',
});

export const addCartLine: AddCartLineRoute = cart.action('lines', {
  operationId: 'addCartLine',
  summary: 'Adds a line to the cart.',
  'x-arthome-invalidates': ['account:cart'],
  body: AddCartLineBodySchema,
  response: CartSchema,
  answer: 'The updated cart.',
});

const lines = cart.resource('lines', { id: CartLineIdParameter });

export const updateCartLine: UpdateCartLineRoute = lines.update({
  operationId: 'updateCartLine',
  summary: 'Changes the quantity of a line.',
  body: UpdateCartLineBodySchema,
  errors: [ApiErrorCode.NOT_FOUND],
  responses: {
    200: {
      description: 'The updated cart.',
      content: { 'application/json': { schema: CartAnswerSchema } },
    },
  },
});

export const removeCartLine: RemoveCartLineRoute = cart
  .resource('lines', { id: CartLineIdParameter, owner: 'caller' })
  .delete({
    operationId: 'removeCartLine',
    summary: 'Removes a line from the cart.',
    response: CartSchema,
    answer: 'The updated cart. A removal replayed on an already-removed line **succeeds**.',
    errors: [ApiErrorCode.NOT_FOUND],
  });
