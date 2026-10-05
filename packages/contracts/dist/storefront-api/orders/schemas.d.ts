import { z } from 'zod';
import { PRICE_TIERS } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { MoneyOut } from '@arthome/core/schema';
import { DateCardSchema } from '../../catalog/index.js';
import { StorefrontEnvelopeMetaSchema } from '../../envelope/index.js';
import type { PathParameter } from '../../http/index.js';
import { CartSchema, OrderSchema, PaymentHandoffSchema, TicketCardSchema } from '../../ticketing/index.js';
export declare const OrderIdParameter: PathParameter<'orderId', z.ZodString>;
export declare const PurchaseSeatBodySchema: z.ZodObject<{
    dateId: z.ZodString;
    tier: VocabularyIn<typeof PRICE_TIERS>;
    quantity: z.ZodInt;
    expectedTotal: typeof MoneyOut;
    contributionMinor: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    applyCreditId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    profileId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    declaredTaxLocation: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        country: z.ZodOptional<z.ZodString>;
        subdivision: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        postalCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const SeatPurchaseSchema: z.ZodObject<{
    tickets: z.ZodArray<typeof TicketCardSchema>;
    date: typeof DateCardSchema;
    order: typeof OrderSchema;
}, z.core.$loose>;
export declare const SeatPurchaseAnswerSchema: z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
    data: typeof SeatPurchaseSchema;
}, z.core.$loose>>;
export declare const CheckoutCartBodySchema: z.ZodObject<{
    quoteId: z.ZodString;
    shippingAddress: z.ZodObject<{
        line1: z.ZodString;
        line2: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        city: z.ZodString;
        postalCode: z.ZodString;
        countryCode: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const MerchCheckoutSchema: z.ZodObject<{
    orders: z.ZodArray<typeof OrderSchema>;
    cart: typeof CartSchema;
}, z.core.$loose>;
export declare const MerchCheckoutAnswerSchema: z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
    data: typeof MerchCheckoutSchema;
}, z.core.$loose>>;
export declare const OrderDetailSchema: z.ZodObject<{
    order: typeof OrderSchema;
    tickets: z.ZodOptional<z.ZodArray<typeof TicketCardSchema>>;
    handoff: z.ZodOptional<typeof PaymentHandoffSchema>;
}, z.core.$loose>;
export type PurchaseSeatBody = z.output<typeof PurchaseSeatBodySchema>;
export type SeatPurchase = z.output<typeof SeatPurchaseSchema>;
export type SeatPurchaseAnswer = z.output<typeof SeatPurchaseAnswerSchema>;
export type CheckoutCartBody = z.output<typeof CheckoutCartBodySchema>;
export type MerchCheckout = z.output<typeof MerchCheckoutSchema>;
export type MerchCheckoutAnswer = z.output<typeof MerchCheckoutAnswerSchema>;
export type OrderDetail = z.output<typeof OrderDetailSchema>;
//# sourceMappingURL=schemas.d.ts.map