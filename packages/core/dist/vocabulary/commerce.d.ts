/**
 * Viewer-commerce vocabularies: what the viewer buys, and what that purchase
 * opens.
 *
 * ⚠ THIS FILE IS A DECLARING FILE (see catalog.ts).
 */
/** Settled by `shared`: `enums.priceTier`. */
export declare const PRICE_TIERS: readonly ["full", "reduced", "support"];
export type PriceTier = (typeof PRICE_TIERS)[number];
export declare const PriceTier: {
    readonly FULL: "full";
    readonly REDUCED: "reduced";
    readonly SUPPORT: "support";
};
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
export declare const PLAN_TIERS: readonly ["free", "pass", "premium"];
export type PlanTier = (typeof PLAN_TIERS)[number];
export declare const PlanTier: {
    readonly FREE: "free";
    readonly PASS: "pass";
    readonly PREMIUM: "premium";
};
/**
 * The NINE openings `catalogue.json` actually carries.
 *
 * Spelling: `shared/`'s, TO THE LETTER — so kebab-case (K6).
 * An `opens.includes('multi_screen')` against a payload carrying `multi_screen`
 * returns `false` IN SILENCE: everyone drops to one screen. That is E1's exact
 * shape, reintroduced by the contract after being fixed on the plans.
 */
export declare const PLAN_OPENINGS: readonly ["browse", "trailers", "free_dates", "replays", "no_ads", "one_live_month", "all_lives", "multi_screen", "archive"];
export type PlanOpening = (typeof PLAN_OPENINGS)[number];
export declare const PlanOpening: {
    readonly BROWSE: "browse";
    readonly TRAILERS: "trailers";
    readonly FREE_DATES: "free_dates";
    readonly REPLAYS: "replays";
    readonly NO_ADS: "no_ads";
    readonly ONE_LIVE_MONTH: "one_live_month";
    readonly ALL_LIVES: "all_lives";
    readonly MULTI_SCREEN: "multi_screen";
    readonly ARCHIVE: "archive";
};
export declare const SUBSCRIPTION_STATES: readonly ["active", "past_due", "cancelled", "trialing"];
export type SubscriptionState = (typeof SUBSCRIPTION_STATES)[number];
export declare const SubscriptionState: {
    readonly ACTIVE: "active";
    readonly PAST_DUE: "past_due";
    readonly CANCELLED: "cancelled";
    readonly TRIALING: "trialing";
};
/**
 * Five reasons observed in the design, each with a distinct rule.
 * `late-rate` is PRO RATA of the time remaining: the price depends on the
 * moment of reading, so it travels with its validity and is never a frozen
 * string.
 */
export declare const PROMOTION_REASONS: readonly ["pre_sale", "preview_night", "discovery_rate", "final_date", "late_rate"];
export type PromotionReason = (typeof PROMOTION_REASONS)[number];
export declare const PromotionReason: {
    readonly PRE_SALE: "pre_sale";
    readonly PREVIEW_NIGHT: "preview_night";
    readonly DISCOVERY_RATE: "discovery_rate";
    readonly FINAL_DATE: "final_date";
    readonly LATE_RATE: "late_rate";
};
/** D-011: two DISTINCT orders, never a mixed one. */
export declare const ORDER_KINDS: readonly ["seat", "merch", "subscription"];
export type OrderKind = (typeof ORDER_KINDS)[number];
export declare const OrderKind: {
    readonly SEAT: "seat";
    readonly MERCH: "merch";
    readonly SUBSCRIPTION: "subscription";
};
/**
 * `held` while an OUTCOME is open, `refunded` if the date is cancelled,
 * `suspended` while a bank-details change waits for its counter-signature.
 * What `shared/` carries and what has authority: 12% commission, 14-day delay,
 * rounding to the minor unit on each component taken separately.
 */
export declare const PAYOUT_STATES: readonly ["scheduled", "held", "paid", "refunded", "suspended"];
export type PayoutState = (typeof PAYOUT_STATES)[number];
export declare const PayoutState: {
    readonly SCHEDULED: "scheduled";
    readonly HELD: "held";
    readonly PAID: "paid";
    readonly REFUNDED: "refunded";
    readonly SUSPENDED: "suspended";
};
/**
 * The rate depends on the pair JURISDICTION x NATURE OF SUPPLY, never on a
 * per-market constant. Derby Quad v HMRC held that the theatre-ticket exemption
 * DOES NOT EXTEND to a live stream.
 */
export declare const TAX_SUPPLY_KINDS: readonly ["live_stream_access", "replay_access", "subscription", "merchandise"];
export type TaxSupplyKind = (typeof TAX_SUPPLY_KINDS)[number];
export declare const TaxSupplyKind: {
    readonly LIVE_STREAM_ACCESS: "live_stream_access";
    readonly REPLAY_ACCESS: "replay_access";
    readonly SUBSCRIPTION: "subscription";
    readonly MERCHANDISE: "merchandise";
};
/**
 * The EU requires TWO NON-CONTRADICTORY pieces of evidence for a B2C sale — and
 * Stripe Tax favours a single address instead of comparing them, so the
 * evidence rule CANNOT be delegated to it.
 */
export declare const TAX_EVIDENCE_KINDS: readonly ["billing_address", "ip_address", "bank_country", "card_country", "sim_country", "declared_by_buyer"];
export type TaxEvidenceKind = (typeof TAX_EVIDENCE_KINDS)[number];
export declare const TaxEvidenceKind: {
    readonly BILLING_ADDRESS: "billing_address";
    readonly IP_ADDRESS: "ip_address";
    readonly BANK_COUNTRY: "bank_country";
    readonly CARD_COUNTRY: "card_country";
    readonly SIM_COUNTRY: "sim_country";
    readonly DECLARED_BY_BUYER: "declared_by_buyer";
};
/** Roughly 9,000 US jurisdictions: a country allows no calculation at all. */
export declare const TAX_JURISDICTION_LEVELS: readonly ["country", "state", "county", "city"];
export type TaxJurisdictionLevel = (typeof TAX_JURISDICTION_LEVELS)[number];
export declare const TaxJurisdictionLevel: {
    readonly COUNTRY: "country";
    readonly STATE: "state";
    readonly COUNTY: "county";
    readonly CITY: "city";
};
//# sourceMappingURL=commerce.d.ts.map