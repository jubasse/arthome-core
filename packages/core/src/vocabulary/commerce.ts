/**
 * Viewer-commerce vocabularies: what the viewer buys, and what that purchase
 * opens.
 *
 * ⚠ THIS FILE IS A DECLARING FILE (see catalog.ts).
 */

/** Settled by `shared`: `enums.priceTier`. */
export const PRICE_TIERS = ['full', 'reduced', 'support'] as const;
export type PriceTier = (typeof PRICE_TIERS)[number];

export const PriceTier = {
  FULL: 'full',
  REDUCED: 'reduced',
  SUPPORT: 'support',
} as const;

/**
 * E1 — THE MOST SERIOUS GAP IN THE HANDOVER FILE, and it is not a display
 * defect.
 *
 * Four disjoint vocabularies coexisted: `plans[]` in `catalogue.json`
 * (`free`/`pass`/`premium`), `accounts[].plan` (`season`/`monthly`/`none`), the
 * i18n files translating all six, and two mockups inventing more. VERIFIED
 * consequence: `helpers.planOf()` does
 * `plans().filter(p => p.id === account.plan)[0] || plans()[0]` — NO reference
 * account matches its own plan, so ALL of them silently fall back to `free`.
 * And since `plan.opens[]` gates playback access, that is an AUTHORIZATION
 * DEFECT.
 *
 * `catalogue.json` has authority. `monthly`, `season` and `none` are removed:
 * no data references them. And a single-ticket purchase is not a plan, it is a
 * PURCHASE MODE: it does not belong in this vocabulary.
 */
export const PLAN_TIERS = ['free', 'pass', 'premium'] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export const PlanTier = {
  FREE: 'free',
  PASS: 'pass',
  PREMIUM: 'premium',
} as const;

/**
 * The NINE openings `catalogue.json` actually carries.
 *
 * Spelling: `shared/`'s, TO THE LETTER — so kebab-case (K6).
 * An `opens.includes('multi_screen')` against a payload carrying `multi_screen`
 * returns `false` IN SILENCE: everyone drops to one screen. That is E1's exact
 * shape, reintroduced by the contract after being fixed on the plans.
 */
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
 * Five reasons observed in the design, each with a distinct rule.
 * `late-rate` is PRO RATA of the time remaining: the price depends on the
 * moment of reading, so it travels with its validity and is never a frozen
 * string.
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

/** D-011: two DISTINCT orders, never a mixed one. */
export const ORDER_KINDS = ['seat', 'merch', 'subscription'] as const;
export type OrderKind = (typeof ORDER_KINDS)[number];

export const OrderKind = {
  SEAT: 'seat',
  MERCH: 'merch',
  SUBSCRIPTION: 'subscription',
} as const;

/**
 * `held` while an OUTCOME is open, `refunded` if the date is cancelled,
 * `suspended` while a bank-details change waits for its counter-signature.
 * What `shared/` carries and what has authority: 12% commission, 14-day delay,
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
 * The rate depends on the pair JURISDICTION x NATURE OF SUPPLY, never on a
 * per-market constant. Derby Quad v HMRC held that the theatre-ticket exemption
 * DOES NOT EXTEND to a live stream.
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
 * The EU requires TWO NON-CONTRADICTORY pieces of evidence for a B2C sale — and
 * Stripe Tax favours a single address instead of comparing them, so the
 * evidence rule CANNOT be delegated to it.
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
