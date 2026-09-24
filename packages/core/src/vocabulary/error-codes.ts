import { WATCH_DENIAL_REASONS } from './entitlement.js';

/**
 * THE ERROR CODES, DECLARED — and until today most of them were declared nowhere.
 *
 * ⚠ A SERVED CODE IS ITS OWN TRANSLATION KEY. That is the ruling behind the
 *   spelling: the server never sends a sentence, because a sentence chooses the
 *   reader's language for them, so it sends a code the surface looks up. One
 *   format, `context.what_happened`, and the value IS the key.
 *
 * ⚠ THE NAME KEEPS THE CAPITALS AND THE VALUE CARRIES THE KEY. Code writes
 *   `ModerationErrorCode.ALREADY_SETTLED`; the wire carries
 *   `moderation.already_settled`. Nothing at a call site says the value.
 *
 * ⚠ WHY THE PREFIX IS NOT DECORATION, measured rather than asserted: flattening
 *   the domain's 24 codes to capitals would have MERGED FOUR ERRORS INTO TWO
 *   today — `instant.invalid` and `rate.invalid` both becoming `INVALID`,
 *   `hold.quantity_invalid` and `order.quantity_invalid` both becoming
 *   `QUANTITY_INVALID`. The prefix is what stops two different failures sharing
 *   a name.
 *
 * ⚠ AND WHY THIS FILE EXISTS AT ALL. 35 error codes were published in the two
 *   contracts. Exactly ONE existed in this package. The other 34 lived only
 *   inside response EXAMPLES — a position `check-vocabulary` does not read and
 *   `check-enums` does not sweep, so no instrument here had ever seen them. A
 *   code with no owning constant is one every surface hardcodes and nobody can
 *   rename.
 *
 * *The spelling was the symptom. This was the defect.* D-067.
 */

/**
 * The BFF's OWN refusals, and the only family here that is not a domain notion.
 * `api.not_found` is not a missing aggregate: it is a route that does not
 * resolve. A service that reaches for one of these to express a domain rule has
 * put a transport concern where a rule belongs, and the surface will render
 * "not found" for a date that exists and is simply not on sale.
 */
export const API_ERROR_CODES = [
  'api.unauthenticated',
  'api.forbidden',
  'api.not_found',
  'api.rate_limited',
  'api.schema_invalid',
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
  UPSTREAM_UNAVAILABLE: 'api.upstream_unavailable',
  CURSOR_TOO_OLD: 'api.cursor_too_old',
  SORT_KEY_FORBIDDEN: 'api.sort_key_forbidden',
  PERIOD_FILTER_REQUIRED: 'api.period_filter_required',
  RIGHTS_VERSION_STALE: 'api.rights_version_stale',
} as const;

/**
 * Sign-in, sign-up and session refusals.
 * `identity.signed_out_elsewhere` is served to a session that is STILL OPEN on
 * this device and has been revoked from another. It is not an authentication
 * failure and must not be retried as one.
 */
export const IDENTITY_ERROR_CODES = [
  'identity.email_taken',
  'identity.two_factor_required',
  'identity.signed_out_elsewhere',
] as const;
export type IdentityErrorCode = (typeof IDENTITY_ERROR_CODES)[number];

export const IdentityErrorCode = {
  EMAIL_TAKEN: 'identity.email_taken',
  TWO_FACTOR_REQUIRED: 'identity.two_factor_required',
  SIGNED_OUT_ELSEWHERE: 'identity.signed_out_elsewhere',
} as const;

/**
 * Device pairing — the television's way in, where the same code is
 * polled repeatedly.
 * `pairing.slow_down` is a RATE signal on a legitimate poll, not a refusal: a
 * surface that treats it as one abandons a pairing that was about to succeed.
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

/**
 * Chat refusals. Both are about WHO may write, never about what was written — a removed message is moderation's vocabulary, not this one.
 */
export const CHAT_ERROR_CODES = ['chat.holders_only', 'chat.rate_limited'] as const;
export type ChatErrorCode = (typeof CHAT_ERROR_CODES)[number];

export const ChatErrorCode = {
  HOLDERS_ONLY: 'chat.holders_only',
  RATE_LIMITED: 'chat.rate_limited',
} as const;

/**
 * The moderation queue's two concurrency refusals.
 * Both mean another moderator got there first, and they are NOT the same event:
 * `already_claimed` is recoverable by waiting, `already_settled` is final.
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
 * Refusals about a DATE and what may still be changed on it.
 * Every one of these is a one-way passage showing through: once seats are sold,
 * once prices are engaged, once a replay policy is final, the door is shut. They
 * are the wire's half of `publication.ts`'s irreversible transitions.
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
 * Channel membership, crew and ownership refusals.
 * `channel.same_actor_forbidden` is the four-eyes rule made into a code: the
 * person who raised a bank-change request may not countersign it.
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

/**
 * Payout and reconciliation refusals. A period does not close over an unexplained discrepancy — the money has to be accounted for before the book shuts.
 */
export const PAYOUT_ERROR_CODES = ['payout.reconciliation_discrepancy_unexplained'] as const;
export type PayoutErrorCode = (typeof PAYOUT_ERROR_CODES)[number];

export const PayoutErrorCode = {
  RECONCILIATION_DISCREPANCY_UNEXPLAINED: 'payout.reconciliation_discrepancy_unexplained',
} as const;

/**
 * Purchase refusals beyond the four already carried by `failureCode`.
 */
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
 * THE DOMAIN'S OWN refusals — the 24 codes `DomainError` was already throwing as
 * string literals, plus the studio's checklist refusal the contract published.
 *
 * ⚠ THESE WERE LITERALS AT THEIR THROW SITES and nothing compared them to
 *   anything. Declaring them here is what makes `arthome-check-enums` report the
 *   copy, which it did within the minute for the one that overlapped an already
 *   declared vocabulary — `moderation.already_settled` — and which it now does
 *   for all of them.
 *
 * ⚠ AND THE PREFIX IS THE WHOLE RECORD OF WHY THIS FORMAT WAS CHOSEN. Strip it
 *   and `instant.invalid` collides with `rate.invalid`, `hold.quantity_invalid`
 *   with `order.quantity_invalid`. Four failures, two names, with 24 codes.
 */
/**
 * THE DOMAIN'S refusals THAT REACH A SURFACE — a rule said no and somebody has
 * to be told why.
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
 * THE DOMAIN'S INTERNAL GUARDS, which no contract publishes and none should.
 *
 * ⚠ THE SPLIT IS A JUDGEMENT AND IT IS FLAGGED AS ONE. `check-vocabulary`'s
 *   inverse check reported 23 domain codes reaching neither contract, which is
 *   a true finding with two different causes mixed together: some are refusals
 *   the contracts have simply not published yet, and some can only fire on a
 *   value that never came from a client.
 *
 *   `money.currency_mismatch` is summing two currencies. `instant.invalid` is a
 *   malformed instant INSIDE the system — a malformed one from a client is
 *   `api.schema_invalid`, rejected at the boundary before any rule runs. A
 *   surface cannot provoke these and has nothing to render for them, so
 *   publishing them would be a contract promising errors it cannot produce.
 *
 *   TWO WERE FLAGGED AS UNCERTAIN AND BOTH WERE THEN CHECKED. Both hold, and
 *   one of the two REASONS was wrong, which is the part worth keeping:
 *
 *     `money.count_invalid` — guard, confirmed. It protects
 *     `multiplyByCount(price, count)`, and a count reaching that function has
 *     already passed `order.quantity_invalid` upstream. A negative one arriving
 *     here means we let it through, not that a buyer asked for it.
 *
 *     `content.empty_in_both_languages` — published, confirmed, WRONG REASON.
 *     It was justified as an artist submitting an empty form. It is not a write
 *     at all: `pickLanguage` throws it ON READ, when the server composes a
 *     response and finds stored content empty in both languages. A surface meets
 *     it while rendering a page, which is a better argument for publishing than
 *     the one first given.
 *
 *   ⚠ THE QUESTION UNDERNEATH IS SETTLED, AND THE ANSWER IS "AS YOU GO" (D-069).
 *     The project owner ruled that the boundary depends on the case and moves
 *     with the code: the population of rules is small, the codes will shift
 *     during implementation anyway, and the rules that need naming cluster in
 *     the studio. So this split is a STARTING POSITION the first service may
 *     move, not a decision awaiting ratification.
 *
 *     ⚠ ONE STANDING EXCEPTION: `identity.*` STAYS VAGUE ON PURPOSE. An
 *       authentication refusal that says which check failed is an oracle, and
 *       answers a question the caller was not entitled to ask. It is the one
 *       family where "be more specific" is the wrong instinct.
 *
 *   ⚠ THE OLD PHRASING OF THE QUESTION, kept because it is still the right one
 *     to ask of any individual code:
 *     WHERE IS THE VALIDATION BOUNDARY? A badly filled form field either stops
 *     at the door as `api.schema_invalid` or reaches the rule. Until a BFF is
 *     written, every line of this split rests on the first answer.
 *
 *     Nothing here has to remember that. `check-vocabulary` runs the inverse
 *     check: a member declared domain-only that reaches a contract is a failure,
 *     so the day one of these is served the gate says so.
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
 * EVERY error code, composed — the vocabulary the two contracts declare against.
 *
 * ⚠ SPREAD, NEVER RETYPED. A union written out by hand is a parallel literal
 *   table of nine other tables, and it would drift the first time a family gains
 *   a member. Adding one to any list above puts it here with nothing to edit.
 *
 * ⚠ AND IT EXISTS BECAUSE THE GATE ASKED FOR IT, from the direction nobody
 *   watches. `check-vocabulary` runs an INVERSE check — every member a domain
 *   vocabulary declares must reach at least one contract — and it failed on all
 *   nine families at once. The codes were in both documents the whole time, in
 *   RESPONSE EXAMPLES, which is a position the gate does not read and cannot.
 *
 *   The honest fix was not to widen the gate's reach. It was that **a contract
 *   should publish the error codes it can return**, so a generated client knows
 *   what it may receive instead of discovering it from an example. `Error.code`
 *   now declares this vocabulary, narrowed per document — 32 of these in the
 *   storefront, 25 in the studio, and the gate compares both.
 * ⚠ THE ANNOTATION IS DERIVED, NOT WRITTEN OUT. `isolatedDeclarations` refuses
 *   a spread array without one — `TS9018`, because it will not infer what it
 *   cannot check in isolation. Writing the members into the type would be the
 *   parallel literal table this file exists against, in a type position where
 *   nobody greps. `readonly [...typeof API_ERROR_CODES, …]` composes the tuple
 *   types the same way the value composes the tuples, so a member added to any
 *   family still propagates with nothing to edit.
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
