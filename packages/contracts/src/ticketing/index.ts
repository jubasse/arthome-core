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

import { ORDER_KINDS, PLAN_TIERS, PRICE_TIERS, SUBSCRIPTION_STATES } from '@arthome/core';
import {
  BuyerTaxLocationSchema,
  MoneyOut,
  type VocabularyOut,
  int64,
  vocabularyOut,
  vocabularyOutLocal,
} from '@arthome/core/schema';

import { DateCardSchema, MediaSetSchema } from '../catalog/index.js';
import { StorefrontLocalizedTextSchema } from '../text/index.js';

const TICKET_STATES = [
  'held',
  'active',
  'cancelled',
  'refunded',
  'transferred',
  'credited',
] as const;
const REFUND_METHODS = ['original_payment_method', 'account_credit'] as const;
const MERCH_STATES = ['on_sale', 'out_of_stock'] as const;
const MERCH_SOURCES = ['arthome', 'shopify', 'woocommerce', 'prestashop', 'drupal', 'api'] as const;
const ORDER_STATES = [
  'pending',
  'awaiting_action',
  'processing',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
  'disputed',
] as const;

const uuid = (): z.ZodString => z.string().meta({ format: 'uuid' });

const instant = (): z.ZodString => z.string().meta({ format: 'date-time' });

export const PriceTierSchema: z.ZodObject<
  {
    tier: VocabularyOut;
    amount: typeof MoneyOut;
    active: z.ZodBoolean;
    validUntil: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$loose
> = z
  .looseObject({
    tier: vocabularyOut(PRICE_TIERS),
    amount: MoneyOut.meta({ 'x-arthome-tax-basis': 'inherited' }),
    active: z.boolean(),
    validUntil: instant()
      .nullable()
      .optional()
      .describe(
        'Present when the current price depends on the instant — the "show already started" price is\n**pro rata to the time remaining** and cannot be a frozen string. 60 s.\n',
      ),
  })
  .meta({ 'x-arthome-price-basis': 'tax_inclusive' });

export const TicketCardSchema: z.ZodObject<
  {
    seatId: z.ZodString;
    dateId: z.ZodString;
    orderId: z.ZodOptional<z.ZodString>;
    seatCode: z.ZodString;
    tier: VocabularyOut;
    state: VocabularyOut;
    cancelDeadline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    date: typeof DateCardSchema;
    refund: z.ZodOptional<
      z.ZodNullable<
        z.ZodObject<
          {
            amount: z.ZodOptional<typeof MoneyOut>;
            delayCode: z.ZodOptional<z.ZodString>;
            method: z.ZodOptional<VocabularyOut>;
          },
          z.core.$loose
        >
      >
    >;
  },
  z.core.$loose
> = z.looseObject({
  seatId: uuid(),
  dateId: uuid(),
  orderId: uuid().optional(),
  seatCode: z
    .string()
    .meta({ examples: ['ATH-7QK2-4M'] })
    .describe(
      '**Issued by the server**, always. It displays identically on web, mobile and television; the\ndesign computes it by hashing, which would give **three different codes for the same seat** as\nsoon as one surface changed its hash function.\n',
    ),
  tier: vocabularyOut(PRICE_TIERS),
  state: vocabularyOutLocal(
    TICKET_STATES,
    "A state machine local to this resource. It is the contract's own, not the domain's: the domain owns the facts, this owns how far a request has got.",
  ),
  cancelDeadline: instant()
    .nullable()
    .optional()
    .describe(
      'Served as an **instant**. "Up to 1 h before the start" is a domain rule, not a screen\ncaption.\n',
    ),
  date: DateCardSchema,
  refund: z
    .looseObject({
      amount: MoneyOut.meta({ 'x-arthome-tax-basis': 'inherited' }).optional(),
      delayCode: z
        .string()
        .meta({ examples: ['refund_delay_business_days_3_5'] })
        .optional(),
      method: vocabularyOutLocal(
        REFUND_METHODS,
        "Mirrors the payment provider's state machine. Theirs to change, ours to reflect — inventing a member here would describe a state their API never sends.",
      ).optional(),
    })
    .nullable()
    .optional()
    .describe(
      'What the viewer gets back, and **where**. The amount and a **delay code** — never the\nsentence "3 to 5 business days", which is a policy.\n',
    ),
});

export const MerchItemSchema: z.ZodObject<
  {
    id: z.ZodString;
    channelId: z.ZodString;
    showId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    label: typeof StorefrontLocalizedTextSchema;
    variants: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            id: z.ZodString;
            label: z.ZodString;
            inStock: z.ZodBoolean;
            price: z.ZodOptional<typeof MoneyOut>;
          },
          z.core.$loose
        >
      >
    >;
    price: z.ZodOptional<typeof MoneyOut>;
    state: VocabularyOut;
    source: VocabularyOut;
    merchantUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    pinnedDuringLive: z.ZodOptional<z.ZodBoolean>;
    media: z.ZodOptional<typeof MediaSetSchema>;
  },
  z.core.$loose
> = z.looseObject({
  id: uuid(),
  channelId: uuid(),
  showId: uuid().nullable().optional(),
  label: StorefrontLocalizedTextSchema,
  variants: z
    .array(
      z.looseObject({
        id: z.string(),
        label: z.string().meta({ examples: ['M'] }),
        inStock: z.boolean(),
        price: MoneyOut.meta({ 'x-arthome-tax-basis': 'inclusive' }).optional(),
      }),
    )
    .optional()
    .describe(
      '**A T-shirt without a size is not sellable.** The contract carries the variants; a cart line\nreferences a variant, never a bare item.\n',
    ),
  price: MoneyOut.meta({ 'x-arthome-tax-basis': 'inclusive' }).optional(),
  state: vocabularyOutLocal(
    MERCH_STATES,
    "A state machine local to this resource. It is the contract's own, not the domain's: the domain owns the facts, this owns how far a request has got.",
  ),
  source: vocabularyOutLocal(
    MERCH_SOURCES,
    'An external provider or platform identifier. It is their vocabulary, not ours, and it changes when they change.',
  ).describe(
    "The item's origin. An external source is not sold by us: it links out to `merchantUrl`, and\nno cart accepts it.\n",
  ),
  merchantUrl: z.string().meta({ format: 'uri' }).nullable().optional(),
  pinnedDuringLive: z.boolean().optional(),
  media: MediaSetSchema.optional(),
});

export const CartLineSchema: z.ZodObject<
  {
    id: z.ZodString;
    itemId: z.ZodString;
    variantId: z.ZodString;
    channelId: z.ZodString;
    quantity: z.ZodNumber;
    unitPrice: typeof MoneyOut;
    version: z.ZodNumber;
  },
  z.core.$loose
> = z.looseObject({
  id: uuid(),
  itemId: uuid(),
  variantId: z.string(),
  channelId: uuid(),
  quantity: int64().meta({ format: undefined }).min(1),
  unitPrice: MoneyOut.meta({ 'x-arthome-tax-basis': 'inclusive' }),
  version: int64()
    .meta({ format: undefined })
    .describe(
      '**The ordering comes from the server.** Conflict between two devices: per line, last writer\nwins, arbitrated by this version number — never by a date from the phone, whose clock drifts\nand jumps.\n',
    ),
});

export const OrderSchema: z.ZodObject<
  {
    id: z.ZodString;
    reference: z.ZodString;
    kind: VocabularyOut;
    channelId: z.ZodOptional<z.ZodString>;
    state: VocabularyOut;
    total: z.ZodOptional<typeof MoneyOut>;
    placedAt: z.ZodString;
    invoiceAvailable: z.ZodOptional<z.ZodBoolean>;
    buyerTaxLocation: z.ZodOptional<typeof BuyerTaxLocationSchema>;
  },
  z.core.$loose
> = z.looseObject({
  id: uuid(),
  reference: z
    .string()
    .meta({ examples: ['ATH-2026-00042'] })
    .describe('**Readable** reference, the one support reads out over the phone.'),
  kind: vocabularyOut(ORDER_KINDS),
  channelId: uuid().optional(),
  state: vocabularyOutLocal(
    ORDER_STATES,
    "Mirrors the payment provider's state machine. Theirs to change, ours to reflect — inventing a member here would describe a state their API never sends.",
  ),
  total: MoneyOut.meta({ 'x-arthome-tax-basis': 'inclusive' }).optional(),
  placedAt: instant(),
  invoiceAvailable: z.boolean().optional(),
  buyerTaxLocation: BuyerTaxLocationSchema.optional().describe(
    "**Resolved and frozen at the instant of the sale.** It is not reread later: a viewer's\ncountry changes between two reads, and an invoice is kept for ten years.\n",
  ),
});

export const SubscriptionSchema: z.ZodObject<
  {
    planTier: VocabularyOut;
    state: VocabularyOut;
    startedAt: z.ZodOptional<z.ZodString>;
    currentPeriodEnd: z.ZodString;
    cancelAtPeriodEnd: z.ZodOptional<z.ZodBoolean>;
    paymentMethodRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$loose
> = z.looseObject({
  planTier: vocabularyOut(PLAN_TIERS),
  state: vocabularyOut(SUBSCRIPTION_STATES),
  startedAt: instant().optional(),
  currentPeriodEnd: instant(),
  cancelAtPeriodEnd: z.boolean().optional(),
  paymentMethodRef: z.string().nullable().optional(),
});
