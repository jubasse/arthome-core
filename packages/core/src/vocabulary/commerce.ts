/**
 * Viewer-commerce vocabularies: what the viewer buys, and what that purchase
 * opens.
 */

/** The price tier on a ticket, settled by `shared`: `enums.priceTier`. */
export const PRICE_TIERS = ['full', 'reduced', 'support'] as const;
export type PriceTier = (typeof PRICE_TIERS)[number];

export const PriceTier = {
  FULL: 'full',
  REDUCED: 'reduced',
  SUPPORT: 'support',
} as const;

/**
 * The plan a viewer holds; `catalogue.json` has authority.
 *
 * E1: of four disjoint vocabularies, `helpers.planOf()` did
 * `plans().filter(p => p.id === account.plan)[0] || plans()[0]`, and no reference
 * account matched its own plan, so all of them fell silently back to `free` —
 * an authorization defect, since `plan.opens[]` gates playback.
 */
export const PLAN_TIERS = ['free', 'pass', 'premium'] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export const PlanTier = {
  FREE: 'free',
  PASS: 'pass',
  PREMIUM: 'premium',
} as const;

/** The nine openings `catalogue.json` carries. */
export const PLAN_OPENINGS = [
  'browse',
  'trailers',
  'free_dates',
  'replays',
  'no_ads',
  'one_live_month',
  'all_lives',
  'multi_screen',
  'archive',
] as const;
export type PlanOpening = (typeof PLAN_OPENINGS)[number];

export const PlanOpening = {
  BROWSE: 'browse',
  TRAILERS: 'trailers',
  FREE_DATES: 'free_dates',
  REPLAYS: 'replays',
  NO_ADS: 'no_ads',
  ONE_LIVE_MONTH: 'one_live_month',
  ALL_LIVES: 'all_lives',
  MULTI_SCREEN: 'multi_screen',
  ARCHIVE: 'archive',
} as const;

export const SUBSCRIPTION_STATES = ['active', 'past_due', 'cancelled', 'trialing'] as const;
export type SubscriptionState = (typeof SUBSCRIPTION_STATES)[number];

export const SubscriptionState = {
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELLED: 'cancelled',
  TRIALING: 'trialing',
} as const;

/**
 * Five reasons observed in the design, each with a distinct rule. `late_rate` is
 * pro rata of the time remaining, so the price depends on the moment of reading
 * and travels with its validity rather than as a frozen string.
 */
export const PROMOTION_REASONS = [
  'pre_sale',
  'preview_night',
  'discovery_rate',
  'final_date',
  'late_rate',
] as const;
export type PromotionReason = (typeof PROMOTION_REASONS)[number];

export const PromotionReason = {
  PRE_SALE: 'pre_sale',
  PREVIEW_NIGHT: 'preview_night',
  DISCOVERY_RATE: 'discovery_rate',
  FINAL_DATE: 'final_date',
  LATE_RATE: 'late_rate',
} as const;

/** Distinct orders, never a mixed one (D-011). */
export const ORDER_KINDS = ['seat', 'merch', 'subscription'] as const;
export type OrderKind = (typeof ORDER_KINDS)[number];

export const OrderKind = {
  SEAT: 'seat',
  MERCH: 'merch',
  SUBSCRIPTION: 'subscription',
} as const;

/** adr-payments.md §8's order states; a transition applies only forward (§7.3). */
export const ORDER_STATES = [
  'pending',
  'awaiting_action',
  'processing',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
  'disputed',
] as const;
export type OrderState = (typeof ORDER_STATES)[number];
export const OrderState = {
  PENDING: 'pending',
  AWAITING_ACTION: 'awaiting_action',
  PROCESSING: 'processing',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
  DISPUTED: 'disputed',
} as const;

/** data-model.md §3.3; `held` is gone, a hold is a SeatHold (D-077). */
export const SEAT_STATES = ['active', 'cancelled', 'refunded', 'transferred', 'credited'] as const;
export type SeatState = (typeof SEAT_STATES)[number];
export const SeatState = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  TRANSFERRED: 'transferred',
  CREDITED: 'credited',
} as const;

/** data-model.md §3.2. */
export const SEAT_HOLD_STATES = ['active', 'consumed', 'expired', 'released'] as const;
export type SeatHoldState = (typeof SEAT_HOLD_STATES)[number];
export const SeatHoldState = {
  ACTIVE: 'active',
  CONSUMED: 'consumed',
  EXPIRED: 'expired',
  RELEASED: 'released',
} as const;

/** data-model.md §3.2: the intent whose expiry the hold's is. */
export const SEAT_HOLD_ORIGINS = ['checkout', 'pairing'] as const;
export type SeatHoldOrigin = (typeof SEAT_HOLD_ORIGINS)[number];
export const SeatHoldOrigin = { CHECKOUT: 'checkout', PAIRING: 'pairing' } as const;

/**
 * Why money went back to a viewer: domain facts, not refusals (D-037, D-039), in the order of the
 * proto's `RefundReason`. A studio operator chooses among four; the others the system raises.
 */
export const REFUND_REASONS = [
  'viewer_request',
  'date_cancelled',
  'account_deletion',
  'goodwill',
  'duplicate',
  'dispute',
  'hold_expired_capacity_lost',
] as const;
export type RefundReason = (typeof REFUND_REASONS)[number];

export const RefundReason = {
  VIEWER_REQUEST: 'viewer_request',
  DATE_CANCELLED: 'date_cancelled',
  ACCOUNT_DELETION: 'account_deletion',
  GOODWILL: 'goodwill',
  DUPLICATE: 'duplicate',
  DISPUTE: 'dispute',
  HOLD_EXPIRED_CAPACITY_LOST: 'hold_expired_capacity_lost',
} as const;

/**
 * Where a payout stands: `held` while an outcome is open, `refunded` if the date
 * is cancelled, `suspended` while a bank-details change waits for its
 * counter-signature. `shared/` has authority: 12% commission, 14-day delay,
 * rounding to the minor unit on each component taken separately.
 */
export const PAYOUT_STATES = ['scheduled', 'held', 'paid', 'refunded', 'suspended'] as const;
export type PayoutState = (typeof PAYOUT_STATES)[number];

export const PayoutState = {
  SCHEDULED: 'scheduled',
  HELD: 'held',
  PAID: 'paid',
  REFUNDED: 'refunded',
  SUSPENDED: 'suspended',
} as const;

/**
 * What is being supplied, for tax. The rate depends on the pair jurisdiction x
 * nature of supply, never on a per-market constant: Derby Quad v HMRC held that
 * the theatre-ticket exemption does not extend to a live stream.
 */
export const TAX_SUPPLY_KINDS = [
  'live_stream_access',
  'replay_access',
  'subscription',
  'merchandise',
] as const;
export type TaxSupplyKind = (typeof TAX_SUPPLY_KINDS)[number];

export const TaxSupplyKind = {
  LIVE_STREAM_ACCESS: 'live_stream_access',
  REPLAY_ACCESS: 'replay_access',
  SUBSCRIPTION: 'subscription',
  MERCHANDISE: 'merchandise',
} as const;

/**
 * What may evidence a buyer's location. The EU requires two non-contradictory
 * pieces for a B2C sale, and Stripe Tax favours a single address instead of
 * comparing them, so the evidence rule cannot be delegated to it.
 */
export const TAX_EVIDENCE_KINDS = [
  'billing_address',
  'ip_address',
  'bank_country',
  'card_country',
  'sim_country',
  'declared_by_buyer',
] as const;
export type TaxEvidenceKind = (typeof TAX_EVIDENCE_KINDS)[number];

export const TaxEvidenceKind = {
  BILLING_ADDRESS: 'billing_address',
  IP_ADDRESS: 'ip_address',
  BANK_COUNTRY: 'bank_country',
  CARD_COUNTRY: 'card_country',
  SIM_COUNTRY: 'sim_country',
  DECLARED_BY_BUYER: 'declared_by_buyer',
} as const;

/** Roughly 9,000 US jurisdictions: a country allows no calculation at all. */
export const TAX_JURISDICTION_LEVELS = ['country', 'state', 'county', 'city'] as const;
export type TaxJurisdictionLevel = (typeof TAX_JURISDICTION_LEVELS)[number];

export const TaxJurisdictionLevel = {
  COUNTRY: 'country',
  STATE: 'state',
  COUNTY: 'county',
  CITY: 'city',
} as const;
