/**
 * The error codes, declared — and until D-067 most of them were declared nowhere.
 *
 * A served code is its own translation key. The server never sends a sentence, because a
 * sentence chooses the reader's language for them, so it sends a code the surface looks up: one
 * format, `context.what_happened`, and the value IS the key. The name keeps the capitals and the
 * value carries the key — code writes `ModerationErrorCode.ALREADY_SETTLED`, the wire carries
 * `moderation.already_settled`, and nothing at a call site says the value.
 *
 * The prefix is not decoration, measured rather than asserted: flattening the domain's 24 codes
 * to capitals merges four errors into two — `instant.invalid` and `rate.invalid` both becoming
 * `INVALID`, `hold.quantity_invalid` and `order.quantity_invalid` both `QUANTITY_INVALID`.
 *
 * Why the file exists at all: 35 error codes were published in the two contracts and exactly
 * one existed in this package. The other 34 lived only inside response EXAMPLES, a position
 * `check-vocabulary` does not read and `check-enums` does not sweep, so no instrument here had
 * ever seen them. A code with no owning constant is one every surface hardcodes and nobody can
 * rename. The spelling was the symptom; this was the defect. D-067.
 */
import { WATCH_DENIAL_REASONS } from './entitlement.js';
/**
 * The BFF's own refusals, the only family here that is not a domain notion. `api.not_found` is a
 * route that does not resolve, not a missing aggregate: a service expressing a domain rule with
 * one of these makes the surface render "not found" for a date that exists and is not on sale.
 */
export declare const API_ERROR_CODES: readonly ["api.unauthenticated", "api.forbidden", "api.not_found", "api.rate_limited", "api.schema_invalid", "api.internal", "api.service_unavailable", "api.upstream_unavailable", "api.cursor_too_old", "api.sort_key_forbidden", "api.period_filter_required", "api.rights_version_stale"];
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];
export declare const ApiErrorCode: {
    readonly UNAUTHENTICATED: "api.unauthenticated";
    readonly FORBIDDEN: "api.forbidden";
    readonly NOT_FOUND: "api.not_found";
    readonly RATE_LIMITED: "api.rate_limited";
    readonly SCHEMA_INVALID: "api.schema_invalid";
    readonly INTERNAL: "api.internal";
    readonly SERVICE_UNAVAILABLE: "api.service_unavailable";
    readonly UPSTREAM_UNAVAILABLE: "api.upstream_unavailable";
    readonly CURSOR_TOO_OLD: "api.cursor_too_old";
    readonly SORT_KEY_FORBIDDEN: "api.sort_key_forbidden";
    readonly PERIOD_FILTER_REQUIRED: "api.period_filter_required";
    readonly RIGHTS_VERSION_STALE: "api.rights_version_stale";
};
/**
 * Sign-in, sign-up and session refusals. `identity.signed_out_elsewhere` is served to a session
 * still open on this device and revoked from another: not an authentication failure, and not to
 * be retried as one.
 */
export declare const IDENTITY_ERROR_CODES: readonly ["identity.email_taken", "identity.handle_taken", "identity.two_factor_required", "identity.signed_out_elsewhere"];
export type IdentityErrorCode = (typeof IDENTITY_ERROR_CODES)[number];
export declare const IdentityErrorCode: {
    readonly EMAIL_TAKEN: "identity.email_taken";
    readonly HANDLE_TAKEN: "identity.handle_taken";
    readonly TWO_FACTOR_REQUIRED: "identity.two_factor_required";
    readonly SIGNED_OUT_ELSEWHERE: "identity.signed_out_elsewhere";
};
/**
 * Device pairing, where the same code is polled repeatedly. `pairing.slow_down` is a rate signal
 * on a legitimate poll: a surface treating it as a refusal abandons a pairing about to succeed.
 */
export declare const PAIRING_ERROR_CODES: readonly ["pairing.slow_down", "pairing.identity_mismatch", "pairing.intent_not_engageable", "pairing.execution_engaged"];
export type PairingErrorCode = (typeof PAIRING_ERROR_CODES)[number];
export declare const PairingErrorCode: {
    readonly SLOW_DOWN: "pairing.slow_down";
    readonly IDENTITY_MISMATCH: "pairing.identity_mismatch";
    readonly INTENT_NOT_ENGAGEABLE: "pairing.intent_not_engageable";
    readonly EXECUTION_ENGAGED: "pairing.execution_engaged";
};
/** Chat refusals, both about who may write: a removed message is moderation's vocabulary. */
export declare const CHAT_ERROR_CODES: readonly ["chat.holders_only", "chat.rate_limited"];
export type ChatErrorCode = (typeof CHAT_ERROR_CODES)[number];
export declare const ChatErrorCode: {
    readonly HOLDERS_ONLY: "chat.holders_only";
    readonly RATE_LIMITED: "chat.rate_limited";
};
/**
 * The moderation queue's concurrency refusals. Another moderator got there first, but not the same
 * event: `already_claimed` is recoverable by waiting, `already_settled` is final.
 */
export declare const MODERATION_ERROR_CODES: readonly ["moderation.already_claimed", "moderation.already_settled", "moderation.automatic_cannot_override_human", "moderation.decision_version_stale"];
export type ModerationErrorCode = (typeof MODERATION_ERROR_CODES)[number];
export declare const ModerationErrorCode: {
    readonly ALREADY_CLAIMED: "moderation.already_claimed";
    readonly ALREADY_SETTLED: "moderation.already_settled";
    readonly AUTOMATIC_CANNOT_OVERRIDE_HUMAN: "moderation.automatic_cannot_override_human";
    readonly DECISION_VERSION_STALE: "moderation.decision_version_stale";
};
/**
 * Refusals about a date and what may still be changed on it — the wire's half of
 * `publication.ts`'s irreversible transitions.
 */
export declare const CATALOG_ERROR_CODES: readonly ["date.has_sold_seats", "date.outcome_decision_forbidden", "date.prices_locked", "date.replay_policy_final", "date.technical_check_required", "date.technical_provision_required", "date.stream_key_rotation_during_run"];
export type CatalogErrorCode = (typeof CATALOG_ERROR_CODES)[number];
export declare const CatalogErrorCode: {
    readonly DATE_HAS_SOLD_SEATS: "date.has_sold_seats";
    readonly OUTCOME_DECISION_FORBIDDEN: "date.outcome_decision_forbidden";
    readonly PRICES_LOCKED: "date.prices_locked";
    readonly REPLAY_POLICY_FINAL: "date.replay_policy_final";
    readonly TECHNICAL_CHECK_REQUIRED: "date.technical_check_required";
    readonly TECHNICAL_PROVISION_REQUIRED: "date.technical_provision_required";
    readonly STREAM_KEY_ROTATION_DURING_RUN: "date.stream_key_rotation_during_run";
};
/**
 * Channel membership, crew and ownership refusals. `channel.same_actor_forbidden` is the four-eyes
 * rule as a code: whoever raised a bank-change request may not countersign it.
 */
export declare const CHANNEL_ERROR_CODES: readonly ["channel.has_open_obligations", "channel.crew_role_reserved", "channel.role_not_assignable", "channel.transfer_target_ineligible", "channel.same_actor_forbidden"];
export type ChannelErrorCode = (typeof CHANNEL_ERROR_CODES)[number];
export declare const ChannelErrorCode: {
    readonly CHANNEL_HAS_OPEN_OBLIGATIONS: "channel.has_open_obligations";
    readonly CREW_ROLE_RESERVED: "channel.crew_role_reserved";
    readonly ROLE_NOT_ASSIGNABLE: "channel.role_not_assignable";
    readonly TRANSFER_TARGET_INELIGIBLE: "channel.transfer_target_ineligible";
    readonly SAME_ACTOR_FORBIDDEN: "channel.same_actor_forbidden";
};
/** Payout refusals: a period does not close over an unexplained discrepancy. */
export declare const PAYOUT_ERROR_CODES: readonly ["payout.reconciliation_discrepancy_unexplained"];
export type PayoutErrorCode = (typeof PAYOUT_ERROR_CODES)[number];
export declare const PayoutErrorCode: {
    readonly RECONCILIATION_DISCREPANCY_UNEXPLAINED: "payout.reconciliation_discrepancy_unexplained";
};
/** Purchase refusals beyond the four already carried by `failureCode`. */
export declare const ORDER_ERROR_CODES: readonly ["order.quote_address_mismatch", "order.sold_out", "order.payment_declined", "order.price_stale", "order.plan_unavailable"];
export type OrderErrorCode = (typeof ORDER_ERROR_CODES)[number];
export declare const OrderErrorCode: {
    readonly QUOTE_ADDRESS_MISMATCH: "order.quote_address_mismatch";
    readonly SOLD_OUT: "order.sold_out";
    readonly PAYMENT_DECLINED: "order.payment_declined";
    readonly PRICE_STALE: "order.price_stale";
    readonly PLAN_UNAVAILABLE: "order.plan_unavailable";
};
/**
 * The domain's refusals that reach a surface: a rule said no and somebody has to be told why.
 */
export declare const DOMAIN_ERROR_CODES: readonly ["capacity.tier_must_widen", "content.empty_in_both_languages", "hold.quantity_invalid", "media.size_invalid", "media.url_empty", "order.quantity_invalid", "pairing_code.ambiguous_glyph", "publication.checklist_incomplete", "publication.transition_forbidden", "publication.transition_irreversible", "search.unknown_flag", "seat_code.malformed"];
export type DomainErrorCode = (typeof DOMAIN_ERROR_CODES)[number];
export declare const DomainErrorCode: {
    readonly CAPACITY_TIER_MUST_WIDEN: "capacity.tier_must_widen";
    readonly CONTENT_EMPTY_IN_BOTH_LANGUAGES: "content.empty_in_both_languages";
    readonly HOLD_QUANTITY_INVALID: "hold.quantity_invalid";
    readonly MEDIA_SIZE_INVALID: "media.size_invalid";
    readonly MEDIA_URL_EMPTY: "media.url_empty";
    readonly ORDER_QUANTITY_INVALID: "order.quantity_invalid";
    readonly PAIRING_CODE_AMBIGUOUS_GLYPH: "pairing_code.ambiguous_glyph";
    readonly PUBLICATION_CHECKLIST_INCOMPLETE: "publication.checklist_incomplete";
    readonly PUBLICATION_TRANSITION_FORBIDDEN: "publication.transition_forbidden";
    readonly PUBLICATION_TRANSITION_IRREVERSIBLE: "publication.transition_irreversible";
    readonly SEARCH_UNKNOWN_FLAG: "search.unknown_flag";
    readonly SEAT_CODE_MALFORMED: "seat_code.malformed";
};
/**
 * The domain's internal guards, which no contract publishes and none should.
 *
 * The split is a judgement. `check-vocabulary`'s inverse check reported 23 domain codes
 * reaching neither contract, a true finding with two causes mixed: some are refusals the
 * contracts have not published yet, and some can only fire on a value that never came from a
 * client — `money.currency_mismatch` is summing two currencies, and `instant.invalid` is a
 * malformed instant INSIDE the system, since a client's is `api.schema_invalid` at the boundary.
 * A surface cannot provoke these and has nothing to render for them.
 *
 * Two flagged uncertain were checked. Both hold, and one reason was wrong: `money.count_invalid`
 * is a guard, because a count reaching `multiplyByCount` has already passed
 * `order.quantity_invalid`; `content.empty_in_both_languages` is published, but not because an
 * artist submitted an empty form — `pickLanguage` throws it ON READ, when the server composes a
 * response and finds stored content empty in both languages.
 *
 * The boundary question is settled, and the answer is "as you go" (D-069): it depends on the
 * case and moves with the code, so this split is a starting position the first service may move.
 * Nothing here has to remember it — the inverse check fails the day a member declared domain-only
 * reaches a contract.
 *
 * One standing exception: `identity.*` stays vague on purpose. An authentication refusal that
 * says which check failed is an oracle, and answers a question the caller was not entitled to
 * ask. It is the one family where "be more specific" is the wrong instinct.
 */
export declare const DOMAIN_GUARD_CODES: readonly ["i18n.key_malformed", "instant.invalid", "money.amount_not_integer", "money.count_invalid", "money.currency_invalid", "money.currency_mismatch", "rate.invalid", "timezone.not_iana", "timezone.offset_out_of_range", "window.end_before_start"];
export type DomainGuardCode = (typeof DOMAIN_GUARD_CODES)[number];
export declare const DomainGuardCode: {
    readonly I18N_KEY_MALFORMED: "i18n.key_malformed";
    readonly INSTANT_INVALID: "instant.invalid";
    readonly MONEY_AMOUNT_NOT_INTEGER: "money.amount_not_integer";
    readonly MONEY_COUNT_INVALID: "money.count_invalid";
    readonly MONEY_CURRENCY_INVALID: "money.currency_invalid";
    readonly MONEY_CURRENCY_MISMATCH: "money.currency_mismatch";
    readonly RATE_INVALID: "rate.invalid";
    readonly TIMEZONE_NOT_IANA: "timezone.not_iana";
    readonly TIMEZONE_OFFSET_OUT_OF_RANGE: "timezone.offset_out_of_range";
    readonly WINDOW_END_BEFORE_START: "window.end_before_start";
};
/**
 * Every error code, composed — the vocabulary the two contracts declare against.
 *
 * Spread, never retyped, in the value and in the annotation alike: a hand-written union is a
 * parallel literal table of nine other tables, and `isolatedDeclarations` refuses a spread array
 * without an annotation (`TS9018`).
 *
 * It exists because `check-vocabulary`'s inverse check — every member a domain vocabulary
 * declares must reach at least one contract — failed on all nine families at once. The codes were
 * in both documents the whole time, inside response EXAMPLES, which the gate cannot read. The fix
 * was not widening the gate: a contract should publish the error codes it can return, so
 * `Error.code` declares this vocabulary narrowed per document (32 storefront, 25 studio).
 */
export declare const ERROR_CODES: readonly [
    ...typeof API_ERROR_CODES,
    ...typeof IDENTITY_ERROR_CODES,
    ...typeof PAIRING_ERROR_CODES,
    ...typeof CHAT_ERROR_CODES,
    ...typeof MODERATION_ERROR_CODES,
    ...typeof CATALOG_ERROR_CODES,
    ...typeof CHANNEL_ERROR_CODES,
    ...typeof PAYOUT_ERROR_CODES,
    ...typeof ORDER_ERROR_CODES,
    ...typeof DOMAIN_ERROR_CODES,
    ...typeof WATCH_DENIAL_REASONS
];
export type ErrorCode = (typeof ERROR_CODES)[number];
//# sourceMappingURL=error-codes.d.ts.map