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

import {
  ORDER_KINDS,
  PLAN_OPENINGS,
  PLAN_TIERS,
  PlanOpening,
  PRICE_TIERS,
  SUBSCRIPTION_STATES,
} from '@arthome/core';
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

const EXPORT_KINDS = ['personal_data', 'invoices'] as const;
const EXPORT_STATES = ['queued', 'running', 'ready', 'failed', 'expired'] as const;
const HANDOFF_STATES = ['pending', 'awaiting_action', 'processing'] as const;
const NEXT_ACTION_KINDS = ['redirect_to_url', 'use_stripe_sdk', 'none'] as const;
const QUOTE_LINE_KINDS = [
  'tier',
  'service_fee',
  'subscription_discount',
  'promotion',
  'credit_applied',
] as const;

const PROVIDER_STATE_REASON =
  "Mirrors the payment provider's state machine. Theirs to change, ours to reflect — inventing a member here would describe a state their API never sends.";
const LOCAL_STATE_REASON =
  "A state machine local to this resource. It is the contract's own, not the domain's: the domain owns the facts, this owns how far a request has got.";
const LOCAL_ENDPOINT_REASON =
  'A vocabulary local to this contract. The domain neither produces nor consumes these values — they describe what this endpoint offers, and a new member is an endpoint change.';

export const CartSchema: z.ZodObject<
  {
    lines: z.ZodArray<typeof CartLineSchema>;
    vendorGroups: z.ZodArray<
      z.ZodObject<
        {
          channelId: z.ZodOptional<z.ZodString>;
          lineIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
        },
        z.core.$loose
      >
    >;
  },
  z.core.$loose
> = z
  .looseObject({
    lines: z.array(CartLineSchema),
    vendorGroups: z
      .array(
        z.looseObject({
          channelId: uuid().optional(),
          lineIds: z.array(uuid()).optional(),
        }),
      )
      .describe(
        '**A merchandise order is single-vendor.** A cart holding items from two channels **splits\ninto two orders at payment**, each with its own shipping, commission and payout. Two\nindependent justifications: two shipments, and a Stripe `destination charge` admits **only one\ndestination**.\n',
      ),
  })
  .describe(
    "**The cart lives on the account, not in the browser**: the design shows a persistent cart in\nthe header, it is built up across several sessions from a live show's shop, and all three\nstorefronts display it. A local cart would survive neither a reinstall nor a change of\ndevice.\n",
  );

export const CartQuoteSchema: z.ZodObject<
  {
    groups: z.ZodArray<
      z.ZodObject<
        {
          channelId: z.ZodString;
          subtotal: typeof MoneyOut;
          shipping: z.ZodOptional<typeof MoneyOut>;
          discount: z.ZodOptional<
            z.ZodNullable<
              z.ZodObject<
                {
                  discountReasonCode: z.ZodOptional<z.ZodString>;
                  amount: z.ZodOptional<typeof MoneyOut>;
                },
                z.core.$loose
              >
            >
          >;
          total: typeof MoneyOut;
        },
        z.core.$loose
      >
    >;
    validUntil: z.ZodString;
  },
  z.core.$loose
> = z
  .looseObject({
    groups: z.array(
      z.looseObject({
        channelId: uuid(),
        subtotal: MoneyOut.meta({ 'x-arthome-tax-basis': 'inclusive' }),
        shipping: MoneyOut.meta({ 'x-arthome-tax-basis': 'inclusive' }).optional(),
        discount: z
          .looseObject({
            discountReasonCode: z.string().optional(),
            amount: MoneyOut.meta({ 'x-arthome-tax-basis': 'inherited' }).optional(),
          })
          .nullable()
          .optional()
          .describe(
            '**Shop** discount (15%) or promotion — **never both**: the one most favourable to the viewer\nwins, and the rule lives in `@arthome/core`. Not to be confused with `seatDiscount`\n(10 / 20%), which applies to **seats**: two discounts, two bases, and they coincide in no\nsource (E1).\n',
          ),
        total: MoneyOut.meta({ 'x-arthome-tax-basis': 'inclusive' }),
      }),
    ),
    validUntil: instant().describe('15 minutes.'),
  })
  .describe(
    '**The quote is binding**: the total presented is the one that will be charged. Shipping is\ncomputed **at quoting time**, not on adding. Past `validUntil`, a new quote.\n',
  );

export const ExportRequestSchema: z.ZodObject<
  {
    exportId: z.ZodString;
    kind: VocabularyOut;
    state: VocabularyOut;
    requestedAt: z.ZodString;
    downloadUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    downloadExpiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$loose
> = z
  .looseObject({
    exportId: uuid(),
    kind: vocabularyOutLocal(
      EXPORT_KINDS,
      "A document or export format. It names an accounting tool or a file type, which is the outside world's vocabulary rather than ours.",
    ),
    state: vocabularyOutLocal(EXPORT_STATES, LOCAL_STATE_REASON),
    requestedAt: instant(),
    downloadUrl: z.string().meta({ format: 'uri' }).nullable().optional(),
    downloadExpiresAt: instant().nullable().optional(),
  })
  .describe(
    '**A FEC file or a GDPR export is not an HTTP response.** The command returns an\nacknowledgement and an identifier; the state is queryable; the document arrives through a\n**short-lived signed URL** — usable **without a session cookie**, because an export protected\nby a cookie is undownloadable from a native shell.\n',
  );

export const ExternalOrderRefSchema: z.ZodObject<
  {
    externalRef: z.ZodString;
    externalHost: z.ZodString;
    state: z.ZodOptional<z.ZodLiteral<'external'>>;
    syncedAt: z.ZodString;
    syncSource: z.ZodOptional<z.ZodString>;
  },
  z.core.$loose
> = z
  .looseObject({
    externalRef: z.string(),
    externalHost: z.string(),
    state: z
      .literal('external')
      .optional()
      .describe("**Opaque** vocabulary — we do not know the other shop's states."),
    syncedAt: instant(),
    syncSource: z.string().optional(),
  })
  .describe(
    "An order placed on the artist's own shop is a **read-only reflection**: no invoice, no\ntracking, no refund on our side, and the contract states that explicitly rather than serving\nempty fields. **What we guarantee**: freshness as of `syncedAt`, nothing more. When the host\ndoes not answer, the reflection is served **with its age**, not as an error.\n",
  );

export const PaymentHandoffSchema: z.ZodObject<
  {
    orderId: z.ZodString;
    state: VocabularyOut;
    paymentIntentRef: z.ZodString;
    clientSecret: z.ZodString;
    nextAction: z.ZodOptional<
      z.ZodNullable<
        z.ZodObject<
          {
            kind: z.ZodOptional<VocabularyOut>;
            redirectUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          },
          z.core.$loose
        >
      >
    >;
    returnUrl: z.ZodString;
    expiresAt: z.ZodOptional<z.ZodString>;
  },
  z.core.$loose
> = z
  .looseObject({
    orderId: uuid(),
    state: vocabularyOutLocal(HANDOFF_STATES, PROVIDER_STATE_REASON),
    paymentIntentRef: z
      .string()
      .describe('**Opaque** reference to the domain. Only the adapter knows how to read it.'),
    clientSecret: z.string(),
    nextAction: z
      .looseObject({
        kind: vocabularyOutLocal(NEXT_ACTION_KINDS, PROVIDER_STATE_REASON).optional(),
        redirectUrl: z.string().meta({ format: 'uri' }).nullable().optional(),
      })
      .nullable()
      .optional()
      .describe(
        'What the surface must do next, **declared** rather than guessed: a strong-authentication\nredirect, or nothing.\n',
      ),
    returnUrl: z
      .string()
      .meta({ format: 'uri' })
      .describe(
        '**Where the provider returns after authentication.** Allowlist of **literal strings**, never\na pattern.\n\n**And the return confirms nothing**: *a payment confirmed by a URL parameter is a payment\nconfirmed by the client*. The return says **where to go**; it is `getOrder` — fed by the\nverified webhook — that says **what changed**.\n',
      ),
    expiresAt: instant().optional(),
  })
  .describe(
    '**The step the contract did not have, and without which no payment subject to European strong\nauthentication completes.** The state vocabulary carried `awaiting_action` ← "3-D Secure in\nprogress", and **no operation could either reach that state or leave it**: the three money\ncommands only answered `201 · paid`, with no `clientSecret`, no `nextAction`, no return\naddress.\n\nThis was not a refinement: a significant share of card payments in Europe requires strong\nauthentication. A flow that does not provide for `requires_action` **fails in production on\nperfectly valid payments**, and it fails silently — the order stays `awaiting_action` and\nnothing picks it up.\n\n**The `clientSecret` is produced server-side** and serves only the surface\'s payment element;\nit authorises nothing else and replaces no session.\n',
  );

export const PlanSchema: z.ZodObject<
  {
    tier: VocabularyOut;
    price: typeof MoneyOut;
    opens: z.ZodArray<VocabularyOut>;
    seatDiscountBps: z.ZodNumber;
    concurrentStreamsAllowed: z.ZodOptional<z.ZodNumber>;
  },
  z.core.$loose
> = z.looseObject({
  tier: vocabularyOut(PLAN_TIERS).describe(
    'The authoritative vocabulary. `monthly`, `season` and `none` are **withdrawn**: no data\nreferences them, and four disjoint vocabularies made **every** account fall back to `free` —\nan **authorisation** defect, not a display one (E1).\n',
  ),
  price: MoneyOut.meta({ 'x-arthome-tax-basis': 'inclusive' }),
  opens: z.array(
    vocabularyOut(PLAN_OPENINGS).describe(
      "**One spelling, and only one — which is the part that is not cosmetic.** This is the\nvocabulary `decideWatch` depends on. An `opens.includes('" +
        PlanOpening.MULTI_SCREEN +
        '\')` over a payload\ncarrying `multi_screen` returns `false` **silently**, and everyone falls back to one\nscreen — the shape of the authorisation defect the contract had fixed on **plans** and\nreintroduced on **openings**. Whichever spelling wins, both sides must carry it.\n\n**The rule this motive used to give has been reversed, and it is recorded rather than\nquietly deleted.** It read "kebab spelling, that of the authoritative source", because\n`shared/catalogue.json` carries `free-dates`, `no-ads`, `one-live-month`, `all-lives`,\n`multi-screen` in kebab. D-034 settles it the other way, on a distinction worth keeping:\n`shared/` → `@arthome/core` is a **one-time port**, which already normalises by design\n(D1 drops `light` and adds `essential`, D7 turns relative offsets into instants), while\n`core` ↔ the wire is a **live boundary**, and only a live boundary turns a mapping into\na parallel table with a codec\'s costume. `shared/` is a mockup and will never be a\nruntime participant, so it does not convert and everything downstream of it does.\n\n**K6 is untouched by this.** Its defect was the **divergence** — an\n`opens.includes(…)` returning `false` in silence — never the separator. It is closed by\nthe two sides agreeing, and they now agree on `snake_case`.\n',
    ),
  ),
  seatDiscountBps: int64()
    .meta({ format: undefined })
    .meta({ examples: [2000] }),
  concurrentStreamsAllowed: int64()
    .meta({ format: undefined })
    .optional()
    .describe(
      '`multi_screen` is an **execution constraint**, not a marketing line: `ticketing` publishes the ceiling, `streaming` enforces it.',
    ),
});

export const SeatQuoteSchema: z.ZodObject<
  {
    vatIncluded: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            rateBps: z.ZodNumber;
            amount: typeof MoneyOut;
            jurisdictionCode: z.ZodString;
          },
          z.core.$loose
        >
      >
    >;
    lines: z.ZodArray<
      z.ZodObject<
        {
          kind: VocabularyOut;
          discountReasonCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          amount: typeof MoneyOut;
        },
        z.core.$loose
      >
    >;
    total: typeof MoneyOut;
    validUntil: z.ZodOptional<z.ZodString>;
  },
  z.core.$loose
> = z
  .looseObject({
    vatIncluded: z
      .array(
        z.looseObject({
          rateBps: int64()
            .meta({ format: undefined })
            .meta({ examples: [550] }),
          amount: MoneyOut.meta({ 'x-arthome-tax-basis': 'inherited' }),
          jurisdictionCode: z.string().meta({ examples: ['FR'] }),
        }),
      )
      .optional()
      .describe(
        '**Already inside `total`, never added to it.** One line per jurisdiction, computed at the\ninstant of sale from `BuyerTaxLocation` — which is why it appears here and **never on the\ncatalogue**: a price carrying its VAT would be a price that varies by viewer, and the\ncatalogue would stop being publicly cacheable. That cacheability is the reason tax-inclusive\npricing was chosen.\n',
      ),
    lines: z.array(
      z.looseObject({
        kind: vocabularyOutLocal(QUOTE_LINE_KINDS, LOCAL_ENDPOINT_REASON),
        discountReasonCode: z.string().nullable().optional(),
        amount: MoneyOut.meta({ 'x-arthome-tax-basis': 'inherited' }),
      }),
    ),
    total: MoneyOut.meta({ 'x-arthome-tax-basis': 'inclusive' }),
    validUntil: instant().optional(),
  })
  .describe(
    'The purchase summary for a seat, **composed server-side**. The four lines come from the\ncontract: `tier + service fee − subscription discount − promotion = total`. This is exactly\nthe "a total composed in two places" case the brief cites as a typical defect, and it is\nclosed here.\n\n**Prices are tax-inclusive (D-056), so the VAT does not move the total — and it is served\nanyway**, in `vatIncluded`. EU invoicing requires the line, and the artist needs it. **A total\nthat does not change is exactly why someone will be tempted to omit it.**\n\n**It is a separate field rather than a fifth line, and that is the point.** `lines` are\naddends; a VAT line inside them would be summed by somebody, on some surface, eventually —\nand the total would be wrong by a VAT rate in the direction nobody checks, because it would\nlook larger rather than smaller. What is already inside a total cannot sit in the list of\nthings added to it.\n',
  );
