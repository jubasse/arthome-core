import { z } from 'zod';

import { PRICE_TIERS } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { MoneyOut, uuidIn, uuidOut, vocabularyIn } from '@arthome/core/schema';

import { DateCardSchema } from '../../catalog/index.js';
import { StorefrontEnvelopeMetaSchema } from '../../envelope/index.js';
import type { PathParameter } from '../../http/index.js';
import {
  CartSchema,
  OrderSchema,
  PaymentHandoffSchema,
  TicketCardSchema,
} from '../../ticketing/index.js';

export const OrderIdParameter: PathParameter<'orderId', z.ZodString> = {
  name: 'orderId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

export const PurchaseSeatBodySchema: z.ZodObject<
  {
    dateId: z.ZodString;
    tier: VocabularyIn<typeof PRICE_TIERS>;
    quantity: z.ZodInt;
    expectedTotal: typeof MoneyOut;
    contributionMinor: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    applyCreditId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    profileId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    declaredTaxLocation: z.ZodOptional<
      z.ZodNullable<
        z.ZodObject<
          {
            country: z.ZodOptional<z.ZodString>;
            subdivision: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            postalCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          },
          z.core.$strip
        >
      >
    >;
  },
  z.core.$strip
> = z.object({
  dateId: uuidOut(),
  tier: vocabularyIn(PRICE_TIERS).meta({
    'x-arthome-vocabulary-source': 'PRICE_TIERS',
  }),
  quantity: z.int().min(1).max(10),
  expectedTotal: MoneyOut.meta({
    'x-arthome-tax-basis': 'inclusive',
  }),
  contributionMinor: z.int().meta({ minimum: undefined, maximum: undefined }).nullable().optional(),
  applyCreditId: uuidOut().nullable().optional(),
  profileId: uuidOut().nullable().optional(),
  declaredTaxLocation: z
    .object({
      country: z.string().regex(new RegExp('^[A-Z]{2}$')).optional(),
      subdivision: z.string().nullable().optional(),
      postalCode: z.string().nullable().optional(),
    })
    .nullable()
    .meta({
      description:
        'Location **declared by the buyer**, when the surface asks for it. It enters the register as\none piece of evidence among the others (`declared_by_buyer`) — **it does not replace them**:\nthe server arbitrates, and two pieces of evidence that contradict each other produce\n`evidenceConflicting`, never a refused purchase.\n',
    })
    .optional(),
});

export const SeatPurchaseSchema: z.ZodObject<
  {
    tickets: z.ZodArray<typeof TicketCardSchema>;
    date: typeof DateCardSchema;
    order: typeof OrderSchema;
  },
  z.core.$loose
> = z.looseObject({
  tickets: z.array(TicketCardSchema),
  date: DateCardSchema,
  order: OrderSchema,
});

export const SeatPurchaseAnswerSchema: z.ZodIntersection<
  typeof StorefrontEnvelopeMetaSchema,
  z.ZodObject<{ data: typeof SeatPurchaseSchema }, z.core.$loose>
> = z.intersection(StorefrontEnvelopeMetaSchema, z.looseObject({ data: SeatPurchaseSchema }));

export const CheckoutCartBodySchema: z.ZodObject<
  {
    quoteId: z.ZodString;
    shippingAddress: z.ZodObject<
      {
        line1: z.ZodString;
        line2: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        city: z.ZodString;
        postalCode: z.ZodString;
        countryCode: z.ZodString;
      },
      z.core.$strip
    >;
  },
  z.core.$strip
> = z.object({
  quoteId: uuidOut(),
  shippingAddress: z.object({
    line1: z.string(),
    line2: z.string().nullable().optional(),
    city: z.string(),
    postalCode: z.string(),
    countryCode: z.string().regex(new RegExp('^[A-Z]{2}$')),
  }),
});

export const MerchCheckoutSchema: z.ZodObject<
  { orders: z.ZodArray<typeof OrderSchema>; cart: typeof CartSchema },
  z.core.$loose
> = z.looseObject({
  orders: z.array(OrderSchema),
  cart: CartSchema,
});

export const MerchCheckoutAnswerSchema: z.ZodIntersection<
  typeof StorefrontEnvelopeMetaSchema,
  z.ZodObject<{ data: typeof MerchCheckoutSchema }, z.core.$loose>
> = z.intersection(StorefrontEnvelopeMetaSchema, z.looseObject({ data: MerchCheckoutSchema }));

export const OrderDetailSchema: z.ZodObject<
  {
    order: typeof OrderSchema;
    tickets: z.ZodOptional<z.ZodArray<typeof TicketCardSchema>>;
    handoff: z.ZodOptional<typeof PaymentHandoffSchema>;
  },
  z.core.$loose
> = z.looseObject({
  order: OrderSchema,
  tickets: z.array(TicketCardSchema).optional(),
  handoff: PaymentHandoffSchema.meta({
    description:
      'Present while the order is `awaiting_action` — this is what allows an abandoned authentication to be **resumed**.',
  }).optional(),
});

export type PurchaseSeatBody = z.output<typeof PurchaseSeatBodySchema>;
export type SeatPurchase = z.output<typeof SeatPurchaseSchema>;
export type SeatPurchaseAnswer = z.output<typeof SeatPurchaseAnswerSchema>;
export type CheckoutCartBody = z.output<typeof CheckoutCartBodySchema>;
export type MerchCheckout = z.output<typeof MerchCheckoutSchema>;
export type MerchCheckoutAnswer = z.output<typeof MerchCheckoutAnswerSchema>;
export type OrderDetail = z.output<typeof OrderDetailSchema>;
