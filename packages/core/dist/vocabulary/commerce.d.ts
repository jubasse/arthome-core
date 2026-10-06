/**
 * Viewer-commerce vocabularies: what the viewer buys, and what that purchase
 * opens.
 */
/** The price tier on a ticket, settled by `shared`: `enums.priceTier`. */
export declare const PRICE_TIERS: readonly ["full", "reduced", "support"];
export type PriceTier = (typeof PRICE_TIERS)[number];
export declare const PriceTier: {
    readonly FULL: "full";
    readonly REDUCED: "reduced";
    readonly SUPPORT: "support";
};
/**
 * The plan a viewer holds; `catalogue.json` has authority.
 *
 * E1: of four disjoint vocabularies, `helpers.planOf()` did
 * `plans().filter(p => p.id === account.plan)[0] || plans()[0]`, and no reference
 * account matched its own plan, so all of them fell silently back to `free` —
 * an authorization defect, since `plan.opens[]` gates playback.
 */
export declare const PLAN_TIERS: readonly ["free", "pass", "premium"];
export type PlanTier = (typeof PLAN_TIERS)[number];
export declare const PlanTier: {
    readonly FREE: "free";
    readonly PASS: "pass";
    readonly PREMIUM: "premium";
};
/** The nine openings `catalogue.json` carries. */
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
 * Five reasons observed in the design, each with a distinct rule. `late_rate` is
 * pro rata of the time remaining, so the price depends on the moment of reading
 * and travels with its validity rather than as a frozen string.
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
/** Distinct orders, never a mixed one (D-011). */
export declare const ORDER_KINDS: readonly ["seat", "merch", "subscription"];
export type OrderKind = (typeof ORDER_KINDS)[number];
export declare const OrderKind: {
    readonly SEAT: "seat";
    readonly MERCH: "merch";
    readonly SUBSCRIPTION: "subscription";
};
/** adr-payments.md §8's order states; a transition applies only forward (§7.3). */
export declare const ORDER_STATES: readonly ["pending", "awaiting_action", "processing", "paid", "failed", "refunded", "partially_refunded", "disputed"];
export type OrderState = (typeof ORDER_STATES)[number];
export declare const OrderState: {
    readonly PENDING: "pending";
    readonly AWAITING_ACTION: "awaiting_action";
    readonly PROCESSING: "processing";
    readonly PAID: "paid";
    readonly FAILED: "failed";
    readonly REFUNDED: "refunded";
    readonly PARTIALLY_REFUNDED: "partially_refunded";
    readonly DISPUTED: "disputed";
};
/** data-model.md §3.3; `held` is gone, a hold is a SeatHold (D-077). */
export declare const SEAT_STATES: readonly ["active", "cancelled", "refunded", "transferred", "credited"];
export type SeatState = (typeof SEAT_STATES)[number];
export declare const SeatState: {
    readonly ACTIVE: "active";
    readonly CANCELLED: "cancelled";
    readonly REFUNDED: "refunded";
    readonly TRANSFERRED: "transferred";
    readonly CREDITED: "credited";
};
/** data-model.md §3.2. */
export declare const SEAT_HOLD_STATES: readonly ["active", "consumed", "expired", "released"];
export type SeatHoldState = (typeof SEAT_HOLD_STATES)[number];
export declare const SeatHoldState: {
    readonly ACTIVE: "active";
    readonly CONSUMED: "consumed";
    readonly EXPIRED: "expired";
    readonly RELEASED: "released";
};
/** data-model.md §3.2: the intent whose expiry the hold's is. */
export declare const SEAT_HOLD_ORIGINS: readonly ["checkout", "pairing"];
export type SeatHoldOrigin = (typeof SEAT_HOLD_ORIGINS)[number];
export declare const SeatHoldOrigin: {
    readonly CHECKOUT: "checkout";
    readonly PAIRING: "pairing";
};
/**
 * Why money went back to a viewer: domain facts, not refusals (D-037, D-039), in the order of the
 * proto's `RefundReason`. A studio operator chooses among four; the others the system raises.
 */
export declare const REFUND_REASONS: readonly ["viewer_request", "date_cancelled", "account_deletion", "goodwill", "duplicate", "dispute", "hold_expired_capacity_lost"];
export type RefundReason = (typeof REFUND_REASONS)[number];
export declare const RefundReason: {
    readonly VIEWER_REQUEST: "viewer_request";
    readonly DATE_CANCELLED: "date_cancelled";
    readonly ACCOUNT_DELETION: "account_deletion";
    readonly GOODWILL: "goodwill";
    readonly DUPLICATE: "duplicate";
    readonly DISPUTE: "dispute";
    readonly HOLD_EXPIRED_CAPACITY_LOST: "hold_expired_capacity_lost";
};
/**
 * Why a seat was cancelled, in the order of the proto's `SeatCancelReason`. Its `PAYMENT_FAILED` is
 * never produced: a seat exists only once its order is paid (D-077). Of the refund reasons, only
 * these three cancel a seat (D-095).
 */
export declare const SEAT_CANCEL_REASONS: readonly ["viewer_request", "date_cancelled", "account_deletion"];
export type SeatCancelReason = (typeof SEAT_CANCEL_REASONS)[number];
export declare const SeatCancelReason: {
    readonly VIEWER_REQUEST: "viewer_request";
    readonly DATE_CANCELLED: "date_cancelled";
    readonly ACCOUNT_DELETION: "account_deletion";
};
export declare const REFUND_METHODS: readonly ["original_payment_method", "account_credit"];
export type RefundMethod = (typeof REFUND_METHODS)[number];
export declare const RefundMethod: {
    readonly ORIGINAL_PAYMENT_METHOD: "original_payment_method";
    readonly ACCOUNT_CREDIT: "account_credit";
};
/** How long a refund takes to arrive, as a code a surface explains, never the sentence it stands for. */
export declare const REFUND_DELAY_CODES: readonly ["refund_delay_business_days_3_5"];
export type RefundDelayCode = (typeof REFUND_DELAY_CODES)[number];
export declare const RefundDelayCode: {
    readonly BUSINESS_DAYS_3_5: "refund_delay_business_days_3_5";
};
/** data-model.md §3.7. */
export declare const CREDIT_STATES: readonly ["issued", "partially_used", "used", "expired"];
export type CreditState = (typeof CREDIT_STATES)[number];
export declare const CreditState: {
    readonly ISSUED: "issued";
    readonly PARTIALLY_USED: "partially_used";
    readonly USED: "used";
    readonly EXPIRED: "expired";
};
/** Why a credit was issued, in the order of the proto's `CreditOrigin`. */
export declare const CREDIT_ORIGINS: readonly ["interrupted_date", "goodwill"];
export type CreditOrigin = (typeof CREDIT_ORIGINS)[number];
export declare const CreditOrigin: {
    readonly INTERRUPTED_DATE: "interrupted_date";
    readonly GOODWILL: "goodwill";
};
/**
 * data-model.md §3.9. `lapsed`: notified, did not buy in the window, and may register again.
 * `closed`: ended with its date's cancellation or interruption (D-096), and takes no registration.
 */
export declare const WAITLIST_ENTRY_STATES: readonly ["waiting", "notified", "converted", "left", "lapsed", "closed"];
export type WaitlistEntryState = (typeof WAITLIST_ENTRY_STATES)[number];
export declare const WaitlistEntryState: {
    readonly WAITING: "waiting";
    readonly NOTIFIED: "notified";
    readonly CONVERTED: "converted";
    readonly LEFT: "left";
    readonly LAPSED: "lapsed";
    readonly CLOSED: "closed";
};
/**
 * Where a payout stands: `held` while an outcome is open, `refunded` if the date
 * is cancelled, `suspended` while a bank-details change waits for its
 * counter-signature. `shared/` has authority: 12% commission, 14-day delay,
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
 * What is being supplied, for tax. The rate depends on the pair jurisdiction x
 * nature of supply, never on a per-market constant: Derby Quad v HMRC held that
 * the theatre-ticket exemption does not extend to a live stream.
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
 * What may evidence a buyer's location. The EU requires two non-contradictory
 * pieces for a B2C sale, and Stripe Tax favours a single address instead of
 * comparing them, so the evidence rule cannot be delegated to it.
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