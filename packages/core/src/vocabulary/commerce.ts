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
