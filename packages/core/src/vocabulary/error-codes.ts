/**
 * The error codes, declared — and until D-067 most of them were declared nowhere.
 *
 * ⚠ A served code is its own translation key. The server never sends a sentence, because a
 * sentence chooses the reader's language for them, so it sends a code the surface looks up: one
 * format, `context.what_happened`, and the value IS the key. The name keeps the capitals and the
 * value carries the key — code writes `ModerationErrorCode.ALREADY_SETTLED`, the wire carries
 * `moderation.already_settled`, and nothing at a call site says the value.
 *
 * ⚠ The prefix is not decoration, measured rather than asserted: flattening the domain's 24 codes
 * to capitals merges four errors into two — `instant.invalid` and `rate.invalid` both becoming
 * `INVALID`, `hold.quantity_invalid` and `order.quantity_invalid` both `QUANTITY_INVALID`.
 *
 * ⚠ Why the file exists at all: 35 error codes were published in the two contracts and exactly
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
export const API_ERROR_CODES = [
  'api.unauthenticated',
  'api.forbidden',
  'api.not_found',
  'api.rate_limited',
  'api.schema_invalid',
  // ⚠ Three distinct faults, three members: 500, 502 and 503 all answered
  //   `upstream_unavailable`, so a caller could not tell "we crashed" from "we are restarting" —
  //   the only question it asks. `internal` is never retryable, `service_unavailable` always is,
  //   `upstream_unavailable` is a service behind the BFF failing (transport.md's status table).
  'api.internal',
  'api.service_unavailable',
  'api.upstream_unavailable',
  'api.cursor_too_old',
  'api.sort_key_forbidden',
  'api.period_filter_required',
  'api.rights_version_stale',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const ApiErrorCode = {
  UNAUTHENTICATED: 'api.unauthenticated',
  FORBIDDEN: 'api.forbidden',
  NOT_FOUND: 'api.not_found',
  RATE_LIMITED: 'api.rate_limited',
  SCHEMA_INVALID: 'api.schema_invalid',
  INTERNAL: 'api.internal',
  SERVICE_UNAVAILABLE: 'api.service_unavailable',
  UPSTREAM_UNAVAILABLE: 'api.upstream_unavailable',
  CURSOR_TOO_OLD: 'api.cursor_too_old',
  SORT_KEY_FORBIDDEN: 'api.sort_key_forbidden',
  PERIOD_FILTER_REQUIRED: 'api.period_filter_required',
  RIGHTS_VERSION_STALE: 'api.rights_version_stale',
} as const;

/**
 * Sign-in, sign-up and session refusals. `identity.signed_out_elsewhere` is served to a session
 * still open on this device and revoked from another: not an authentication failure, and not to
 * be retried as one.
 */
export const IDENTITY_ERROR_CODES = [
  'identity.email_taken',
  // ⚠ Added because a service had nothing true to say. `account` carries two `citext unique`
  //   columns and only one had a code, so a handle collision had to be answered with
  //   `email_taken`, which is false, or with a generic code, which the contract's 409 design
  //   forbids — eighteen `'409'` responses share one `Conflict` whose description is "the `code`
  //   says which one". A missing member is how a service publishes a false statement.
  //
  //   Not covered by the standing vagueness exception below: that is about an AUTHENTICATION
  //   refusal naming which check failed, and `email_taken`'s own existence proves the scope.
  //
  //   ⚠ Open, and above this file: whether sign-up should disclose a taken EMAIL at all. The
  //     standard mitigation is to answer as if it succeeded and disambiguate out of band — a
  //     registration-flow decision, and until it is taken, publishing `email_taken` is the
  //     project's answer.
  'identity.handle_taken',
  'identity.two_factor_required',
  'identity.signed_out_elsewhere',
] as const;
export type IdentityErrorCode = (typeof IDENTITY_ERROR_CODES)[number];

export const IdentityErrorCode = {
  EMAIL_TAKEN: 'identity.email_taken',
  HANDLE_TAKEN: 'identity.handle_taken',
  TWO_FACTOR_REQUIRED: 'identity.two_factor_required',
  SIGNED_OUT_ELSEWHERE: 'identity.signed_out_elsewhere',
} as const;

/**
 * Device pairing, where the same code is polled repeatedly. `pairing.slow_down` is a rate signal
 * on a legitimate poll: a surface treating it as a refusal abandons a pairing about to succeed.
 */
export const PAIRING_ERROR_CODES = [
  'pairing.slow_down',
  'pairing.identity_mismatch',
  'pairing.intent_not_engageable',
  'pairing.execution_engaged',
] as const;
export type PairingErrorCode = (typeof PAIRING_ERROR_CODES)[number];

export const PairingErrorCode = {
  SLOW_DOWN: 'pairing.slow_down',
  IDENTITY_MISMATCH: 'pairing.identity_mismatch',
  INTENT_NOT_ENGAGEABLE: 'pairing.intent_not_engageable',
  EXECUTION_ENGAGED: 'pairing.execution_engaged',
} as const;

/** Chat refusals, both about who may write: a removed message is moderation's vocabulary. */
export const CHAT_ERROR_CODES = ['chat.holders_only', 'chat.rate_limited'] as const;
export type ChatErrorCode = (typeof CHAT_ERROR_CODES)[number];

export const ChatErrorCode = {
  HOLDERS_ONLY: 'chat.holders_only',
  RATE_LIMITED: 'chat.rate_limited',
} as const;

/**
 * The moderation queue's concurrency refusals. Another moderator got there first, but not the same
 * event: `already_claimed` is recoverable by waiting, `already_settled` is final.
 */
export const MODERATION_ERROR_CODES = [
  'moderation.already_claimed',
  'moderation.already_settled',
  'moderation.automatic_cannot_override_human',
  'moderation.decision_version_stale',
] as const;
export type ModerationErrorCode = (typeof MODERATION_ERROR_CODES)[number];

export const ModerationErrorCode = {
  ALREADY_CLAIMED: 'moderation.already_claimed',
  ALREADY_SETTLED: 'moderation.already_settled',
  AUTOMATIC_CANNOT_OVERRIDE_HUMAN: 'moderation.automatic_cannot_override_human',
  DECISION_VERSION_STALE: 'moderation.decision_version_stale',
} as const;

/**
 * Refusals about a date and what may still be changed on it — the wire's half of
 * `publication.ts`'s irreversible transitions.
 */
export const CATALOG_ERROR_CODES = [
  'date.has_sold_seats',
  'date.outcome_decision_forbidden',
  'date.prices_locked',
  'date.replay_policy_final',
  'date.technical_check_required',
  'date.technical_provision_required',
  'date.stream_key_rotation_during_run',
] as const;
export type CatalogErrorCode = (typeof CATALOG_ERROR_CODES)[number];

export const CatalogErrorCode = {
  DATE_HAS_SOLD_SEATS: 'date.has_sold_seats',
  OUTCOME_DECISION_FORBIDDEN: 'date.outcome_decision_forbidden',
  PRICES_LOCKED: 'date.prices_locked',
  REPLAY_POLICY_FINAL: 'date.replay_policy_final',
  TECHNICAL_CHECK_REQUIRED: 'date.technical_check_required',
  TECHNICAL_PROVISION_REQUIRED: 'date.technical_provision_required',
  STREAM_KEY_ROTATION_DURING_RUN: 'date.stream_key_rotation_during_run',
} as const;

/**
 * Channel membership, crew and ownership refusals. `channel.same_actor_forbidden` is the four-eyes
 * rule as a code: whoever raised a bank-change request may not countersign it.
 */
export const CHANNEL_ERROR_CODES = [
  'channel.has_open_obligations',
  'channel.crew_role_reserved',
  'channel.role_not_assignable',
  'channel.transfer_target_ineligible',
  'channel.same_actor_forbidden',
] as const;
export type ChannelErrorCode = (typeof CHANNEL_ERROR_CODES)[number];

export const ChannelErrorCode = {
  CHANNEL_HAS_OPEN_OBLIGATIONS: 'channel.has_open_obligations',
  CREW_ROLE_RESERVED: 'channel.crew_role_reserved',
  ROLE_NOT_ASSIGNABLE: 'channel.role_not_assignable',
  TRANSFER_TARGET_INELIGIBLE: 'channel.transfer_target_ineligible',
  SAME_ACTOR_FORBIDDEN: 'channel.same_actor_forbidden',
} as const;

/** Payout refusals: a period does not close over an unexplained discrepancy. */
export const PAYOUT_ERROR_CODES = ['payout.reconciliation_discrepancy_unexplained'] as const;
export type PayoutErrorCode = (typeof PAYOUT_ERROR_CODES)[number];

export const PayoutErrorCode = {
  RECONCILIATION_DISCREPANCY_UNEXPLAINED: 'payout.reconciliation_discrepancy_unexplained',
} as const;

/** Purchase refusals beyond the four already carried by `failureCode`. */
export const ORDER_ERROR_CODES = [
  'order.quote_address_mismatch',
  'order.sold_out',
  'order.payment_declined',
  'order.price_stale',
  'order.plan_unavailable',
] as const;
export type OrderErrorCode = (typeof ORDER_ERROR_CODES)[number];

export const OrderErrorCode = {
  QUOTE_ADDRESS_MISMATCH: 'order.quote_address_mismatch',
  SOLD_OUT: 'order.sold_out',
  PAYMENT_DECLINED: 'order.payment_declined',
  PRICE_STALE: 'order.price_stale',
  PLAN_UNAVAILABLE: 'order.plan_unavailable',
} as const;

/**
 * The domain's refusals that reach a surface: a rule said no and somebody has to be told why.
 */
export const DOMAIN_ERROR_CODES = [
  'capacity.tier_must_widen',
  'content.empty_in_both_languages',
  'hold.quantity_invalid',
  'media.size_invalid',
  'media.url_empty',
  'order.quantity_invalid',
  'pairing_code.ambiguous_glyph',
  'publication.checklist_incomplete',
  'publication.transition_forbidden',
  'publication.transition_irreversible',
  'search.unknown_flag',
  'seat_code.malformed',
] as const;
export type DomainErrorCode = (typeof DOMAIN_ERROR_CODES)[number];

export const DomainErrorCode = {
  CAPACITY_TIER_MUST_WIDEN: 'capacity.tier_must_widen',
  CONTENT_EMPTY_IN_BOTH_LANGUAGES: 'content.empty_in_both_languages',
  HOLD_QUANTITY_INVALID: 'hold.quantity_invalid',
  MEDIA_SIZE_INVALID: 'media.size_invalid',
  MEDIA_URL_EMPTY: 'media.url_empty',
  ORDER_QUANTITY_INVALID: 'order.quantity_invalid',
  PAIRING_CODE_AMBIGUOUS_GLYPH: 'pairing_code.ambiguous_glyph',
  PUBLICATION_CHECKLIST_INCOMPLETE: 'publication.checklist_incomplete',
  PUBLICATION_TRANSITION_FORBIDDEN: 'publication.transition_forbidden',
  PUBLICATION_TRANSITION_IRREVERSIBLE: 'publication.transition_irreversible',
  SEARCH_UNKNOWN_FLAG: 'search.unknown_flag',
  SEAT_CODE_MALFORMED: 'seat_code.malformed',
} as const;

/**
 * The domain's internal guards, which no contract publishes and none should.
 *
 * ⚠ The split is a judgement. `check-vocabulary`'s inverse check reported 23 domain codes
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
 * ⚠ The boundary question is settled, and the answer is "as you go" (D-069): it depends on the
 * case and moves with the code, so this split is a starting position the first service may move.
 * Nothing here has to remember it — the inverse check fails the day a member declared domain-only
 * reaches a contract.
 *
 * ⚠ One standing exception: `identity.*` stays vague on purpose. An authentication refusal that
 * says which check failed is an oracle, and answers a question the caller was not entitled to
 * ask. It is the one family where "be more specific" is the wrong instinct.
 */
export const DOMAIN_GUARD_CODES = [
  'i18n.key_malformed',
  'instant.invalid',
  'money.amount_not_integer',
  'money.count_invalid',
  'money.currency_invalid',
  'money.currency_mismatch',
  'rate.invalid',
  'timezone.not_iana',
  'timezone.offset_out_of_range',
  'window.end_before_start',
] as const;
export type DomainGuardCode = (typeof DOMAIN_GUARD_CODES)[number];

export const DomainGuardCode = {
  I18N_KEY_MALFORMED: 'i18n.key_malformed',
  INSTANT_INVALID: 'instant.invalid',
  MONEY_AMOUNT_NOT_INTEGER: 'money.amount_not_integer',
  MONEY_COUNT_INVALID: 'money.count_invalid',
  MONEY_CURRENCY_INVALID: 'money.currency_invalid',
  MONEY_CURRENCY_MISMATCH: 'money.currency_mismatch',
  RATE_INVALID: 'rate.invalid',
  TIMEZONE_NOT_IANA: 'timezone.not_iana',
  TIMEZONE_OFFSET_OUT_OF_RANGE: 'timezone.offset_out_of_range',
  WINDOW_END_BEFORE_START: 'window.end_before_start',
} as const;

/**
 * Every error code, composed — the vocabulary the two contracts declare against.
 *
 * ⚠ Spread, never retyped, in the value and in the annotation alike: a hand-written union is a
 * parallel literal table of nine other tables, and `isolatedDeclarations` refuses a spread array
 * without an annotation (`TS9018`).
 *
 * It exists because `check-vocabulary`'s inverse check — every member a domain vocabulary
 * declares must reach at least one contract — failed on all nine families at once. The codes were
 * in both documents the whole time, inside response EXAMPLES, which the gate cannot read. The fix
 * was not widening the gate: a contract should publish the error codes it can return, so
 * `Error.code` declares this vocabulary narrowed per document (32 storefront, 25 studio).
 */
export const ERROR_CODES: readonly [
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
  ...typeof WATCH_DENIAL_REASONS,
] = [
  ...API_ERROR_CODES,
  ...IDENTITY_ERROR_CODES,
  ...PAIRING_ERROR_CODES,
  ...CHAT_ERROR_CODES,
  ...MODERATION_ERROR_CODES,
  ...CATALOG_ERROR_CODES,
  ...CHANNEL_ERROR_CODES,
  ...PAYOUT_ERROR_CODES,
  ...ORDER_ERROR_CODES,
  ...DOMAIN_ERROR_CODES,
  ...WATCH_DENIAL_REASONS,
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
