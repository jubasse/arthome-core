/**
 * `@arthome/contracts/ticketing` — Buying: price tiers, tickets, merchandise, the cart line, the order and the subscription.
 *
 * EVERY SCHEMA HERE EMITS A NAMED SCHEMA OF `openapi/storefront.yaml` EXACTLY, and
 * `pnpm run check:emit-diff` is what proves it: the document is authoritative
 * (D-058), so where the two differ the schema changes.
 *
 * The rules this file follows, each of which was a defect the gate found (D-060, D-065):
 *
 *   - `z.looseObject()` on everything a server sends — a closed schema makes a
 *     generated client reject a server that added a field.
 *   - `int64()`, never `z.int()` — the latter emits JavaScript's safe range,
 *     which is in no document.
 *   - `vocabularyOut` / `vocabularyOutNullable` for every enumerated value, never
 *     `z.enum()`: a strict enum fails the whole payload when a member is added,
 *     and televisions run year-old builds. A vocabulary local to the contract
 *     is declared here, passed as `'none'` and carries its reason.
 *   - vocabulary members in `examples` are the named constants, never literals.
 *   - identifiers and instants are `format: uuid` / `format: date-time` WITHOUT a
 *     `pattern`, because that is what the document publishes for these fields;
 *     core's `*IdSchema` and `InstantSchema` add a `pattern` the document does
 *     not carry here. Once the document gains it (D-065 family D), the local
 *     `uuid()` and `instant()` become those core schemas, one edit per file.
 */
import { z } from 'zod';
import { BuyerTaxLocationSchema, MoneyOut, type VocabularyOut } from '@arthome/core/schema';
import { DateCardSchema, MediaSetSchema } from '../catalog/index.js';
import { StorefrontLocalizedTextSchema } from '../text/index.js';
export declare const PriceTierSchema: z.ZodObject<{
    tier: VocabularyOut;
    amount: typeof MoneyOut;
    active: z.ZodBoolean;
    validUntil: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$loose>;
export declare const TicketCardSchema: z.ZodObject<{
    seatId: z.ZodString;
    dateId: z.ZodString;
    orderId: z.ZodOptional<z.ZodString>;
    seatCode: z.ZodString;
    tier: VocabularyOut;
    state: VocabularyOut;
    cancelDeadline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    date: typeof DateCardSchema;
    refund: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        amount: z.ZodOptional<typeof MoneyOut>;
        delayCode: z.ZodOptional<z.ZodString>;
        method: z.ZodOptional<VocabularyOut>;
    }, z.core.$loose>>>;
}, z.core.$loose>;
export declare const MerchItemSchema: z.ZodObject<{
    id: z.ZodString;
    channelId: z.ZodString;
    showId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    label: typeof StorefrontLocalizedTextSchema;
    variants: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        inStock: z.ZodBoolean;
        price: z.ZodOptional<typeof MoneyOut>;
    }, z.core.$loose>>>;
    price: z.ZodOptional<typeof MoneyOut>;
    state: VocabularyOut;
    source: VocabularyOut;
    merchantUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    pinnedDuringLive: z.ZodOptional<z.ZodBoolean>;
    media: z.ZodOptional<typeof MediaSetSchema>;
}, z.core.$loose>;
export declare const CartLineSchema: z.ZodObject<{
    id: z.ZodString;
    itemId: z.ZodString;
    variantId: z.ZodString;
    channelId: z.ZodString;
    quantity: z.ZodNumber;
    unitPrice: typeof MoneyOut;
    version: z.ZodNumber;
}, z.core.$loose>;
export declare const OrderSchema: z.ZodObject<{
    id: z.ZodString;
    reference: z.ZodString;
    kind: VocabularyOut;
    channelId: z.ZodOptional<z.ZodString>;
    state: VocabularyOut;
    total: z.ZodOptional<typeof MoneyOut>;
    placedAt: z.ZodString;
    invoiceAvailable: z.ZodOptional<z.ZodBoolean>;
    buyerTaxLocation: z.ZodOptional<typeof BuyerTaxLocationSchema>;
}, z.core.$loose>;
export declare const SubscriptionSchema: z.ZodObject<{
    planTier: VocabularyOut;
    state: VocabularyOut;
    startedAt: z.ZodOptional<z.ZodString>;
    currentPeriodEnd: z.ZodString;
    cancelAtPeriodEnd: z.ZodOptional<z.ZodBoolean>;
    paymentMethodRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$loose>;
//# sourceMappingURL=index.d.ts.map