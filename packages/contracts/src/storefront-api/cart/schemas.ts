import { z } from 'zod';

import { uuidIn, uuidOut } from '@arthome/core/schema';

import { StorefrontEnvelopeMetaSchema } from '../../envelope/index.js';
import type { PathParameter } from '../../http/index.js';
import { CartSchema } from '../../ticketing/index.js';

export const CartLineIdParameter: PathParameter<'lineId', z.ZodString> = {
  name: 'lineId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

export const AddCartLineBodySchema: z.ZodObject<
  { itemId: z.ZodString; variantId: z.ZodString; quantity: z.ZodInt },
  z.core.$strip
> = z.object({
  itemId: uuidOut(),
  variantId: z.string(),
  quantity: z.int().min(1).max(20),
});

export const UpdateCartLineBodySchema: z.ZodObject<{ quantity: z.ZodInt }, z.core.$strip> =
  z.object({
    quantity: z.int().min(1).max(20),
  });

export const QuoteCartBodySchema: z.ZodObject<
  {
    shippingCountryCode: z.ZodString;
    shippingPostalCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$strip
> = z.object({
  shippingCountryCode: z.string().regex(new RegExp('^[A-Z]{2}$')),
  shippingPostalCode: z.string().nullable().optional(),
});

export const CartAnswerSchema: z.ZodIntersection<
  typeof StorefrontEnvelopeMetaSchema,
  z.ZodObject<{ data: typeof CartSchema }, z.core.$loose>
> = z.intersection(StorefrontEnvelopeMetaSchema, z.looseObject({ data: CartSchema }));

export type AddCartLineBody = z.output<typeof AddCartLineBodySchema>;
export type UpdateCartLineBody = z.output<typeof UpdateCartLineBodySchema>;
export type QuoteCartBody = z.output<typeof QuoteCartBodySchema>;
export type CartAnswer = z.output<typeof CartAnswerSchema>;
