/**
 * The status each error code is answered with, one per code (transport.md §5.5). A route lists
 * codes; the document groups them by this status, and the server answers a refusal with it.
 */

import {
  ApiErrorCode,
  CatalogErrorCode,
  ChannelErrorCode,
  ChatErrorCode,
  DomainErrorCode,
  IdentityErrorCode,
  ModerationErrorCode,
  OrderErrorCode,
  PairingErrorCode,
  PayoutErrorCode,
  WatchDenialReason,
  type ErrorCode,
} from '@arthome/core';

import type { ErrorStatus } from './errors.js';

export const ERROR_STATUS: Readonly<Record<ErrorCode, ErrorStatus>> = {
  [ApiErrorCode.UNAUTHENTICATED]: 401,
  [ApiErrorCode.TOKEN_EXPIRED]: 401,
  [ApiErrorCode.FORBIDDEN]: 403,
  [ApiErrorCode.NOT_FOUND]: 404,
  [ApiErrorCode.RATE_LIMITED]: 429,
  [ApiErrorCode.SCHEMA_INVALID]: 400,
  [ApiErrorCode.INTERNAL]: 500,
  [ApiErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ApiErrorCode.UPSTREAM_UNAVAILABLE]: 502,
  [ApiErrorCode.CURSOR_TOO_OLD]: 410,
  [ApiErrorCode.SORT_KEY_FORBIDDEN]: 403,
  [ApiErrorCode.PERIOD_FILTER_REQUIRED]: 400,
  [ApiErrorCode.RIGHTS_VERSION_STALE]: 403,
  [ApiErrorCode.IDEMPOTENCY_KEY_REUSED]: 409,
  [ApiErrorCode.IDEMPOTENCY_IN_FLIGHT]: 409,
  [ApiErrorCode.DEADLINE_EXCEEDED]: 504,
  [ApiErrorCode.UPSTREAM_TIMEOUT]: 504,
  [ApiErrorCode.PAYLOAD_TOO_LARGE]: 413,
  [ApiErrorCode.UNSUPPORTED_MEDIA_TYPE]: 415,
  [ApiErrorCode.REAUTHENTICATION_REQUIRED]: 403,

  [IdentityErrorCode.EMAIL_TAKEN]: 409,
  [IdentityErrorCode.HANDLE_TAKEN]: 409,
  [IdentityErrorCode.INVALID_CREDENTIALS]: 401,
  [IdentityErrorCode.TWO_FACTOR_REQUIRED]: 401,
  [IdentityErrorCode.SIGNED_OUT_ELSEWHERE]: 403,
  [IdentityErrorCode.VERIFICATION_LINK_INVALID]: 410,

  [PairingErrorCode.SLOW_DOWN]: 429,
  [PairingErrorCode.IDENTITY_MISMATCH]: 403,
  [PairingErrorCode.INTENT_NOT_ENGAGEABLE]: 403,
  [PairingErrorCode.EXECUTION_ENGAGED]: 409,

  [ChatErrorCode.HOLDERS_ONLY]: 403,
  [ChatErrorCode.RATE_LIMITED]: 429,

  [ModerationErrorCode.ALREADY_CLAIMED]: 409,
  [ModerationErrorCode.ALREADY_SETTLED]: 409,
  [ModerationErrorCode.AUTOMATIC_CANNOT_OVERRIDE_HUMAN]: 409,
  [ModerationErrorCode.DECISION_VERSION_STALE]: 409,

  [CatalogErrorCode.ARTIST_SLUG_TAKEN]: 409,
  [CatalogErrorCode.DATE_HAS_SOLD_SEATS]: 409,
  [CatalogErrorCode.OUTCOME_DECISION_FORBIDDEN]: 403,
  [CatalogErrorCode.PRICES_LOCKED]: 409,
  [CatalogErrorCode.PRICES_CURRENCY_MISMATCH]: 409,
  [CatalogErrorCode.REPLAY_POLICY_FINAL]: 409,
  [CatalogErrorCode.TECHNICAL_CHECK_REQUIRED]: 409,
  [CatalogErrorCode.TECHNICAL_PROVISION_REQUIRED]: 409,
  [CatalogErrorCode.PROVISION_DEADLINE_PASSED]: 409,
  [CatalogErrorCode.PROVISION_BELOW_CAPACITY]: 409,
  [CatalogErrorCode.STREAM_KEY_ROTATION_DURING_RUN]: 409,
  [CatalogErrorCode.POSTPONEMENT_LIMIT_REACHED]: 409,

  [ChannelErrorCode.CHANNEL_HAS_OPEN_OBLIGATIONS]: 409,
  [ChannelErrorCode.CREW_ROLE_RESERVED]: 403,
  [ChannelErrorCode.ROLE_NOT_ASSIGNABLE]: 403,
  [ChannelErrorCode.TRANSFER_TARGET_INELIGIBLE]: 409,
  [ChannelErrorCode.SAME_ACTOR_FORBIDDEN]: 403,

  [PayoutErrorCode.RECONCILIATION_DISCREPANCY_UNEXPLAINED]: 409,

  [OrderErrorCode.QUOTE_ADDRESS_MISMATCH]: 409,
  [OrderErrorCode.SOLD_OUT]: 409,
  // Declined by the payment provider, which is not a rule of ours refusing (commerce.ts).
  [OrderErrorCode.PAYMENT_DECLINED]: 402,
  [OrderErrorCode.PRICE_STALE]: 409,
  [OrderErrorCode.PLAN_UNAVAILABLE]: 409,
  [OrderErrorCode.CONTRIBUTION_OUT_OF_RANGE]: 409,
  [OrderErrorCode.CHECKOUT_LINE_UNAVAILABLE]: 409,
  [OrderErrorCode.SALES_QUEUE_ADMISSION_REQUIRED]: 403,
  [OrderErrorCode.LATE_ENTRY_UNACKNOWLEDGED]: 409,
  [OrderErrorCode.SALES_CLOSED]: 409,
  [OrderErrorCode.SEAT_CANCEL_DEADLINE_PASSED]: 409,
  [OrderErrorCode.PAYMENT_METHOD_IN_USE]: 409,

  [DomainErrorCode.CAPACITY_TIER_MUST_WIDEN]: 409,
  [DomainErrorCode.CONTENT_EMPTY_IN_BOTH_LANGUAGES]: 409,
  // A value its schema accepts and a rule refuses: 400, as `api.schema_invalid`.
  [DomainErrorCode.HOLD_QUANTITY_INVALID]: 400,
  [DomainErrorCode.MEDIA_SIZE_INVALID]: 400,
  [DomainErrorCode.MEDIA_URL_EMPTY]: 400,
  [DomainErrorCode.ORDER_QUANTITY_INVALID]: 400,
  [DomainErrorCode.PAIRING_CODE_AMBIGUOUS_GLYPH]: 400,
  [DomainErrorCode.PUBLICATION_CHECKLIST_INCOMPLETE]: 409,
  [DomainErrorCode.PUBLICATION_PROMISE_UNACKNOWLEDGED]: 409,
  [DomainErrorCode.PUBLICATION_TRANSITION_FORBIDDEN]: 409,
  [DomainErrorCode.PUBLICATION_TRANSITION_IRREVERSIBLE]: 409,
  [DomainErrorCode.SEARCH_UNKNOWN_FLAG]: 400,
  [DomainErrorCode.SEAT_CODE_MALFORMED]: 400,
  [DomainErrorCode.STATE_CONFLICT]: 409,

  [WatchDenialReason.NO_SEAT]: 403,
  [WatchDenialReason.ROOM_NOT_OPEN]: 403,
  [WatchDenialReason.OUT_OF_TERRITORY]: 403,
  [WatchDenialReason.SUBSCRIPTION_REQUIRED]: 403,
  [WatchDenialReason.NO_REPLAY]: 403,
  [WatchDenialReason.REPLAY_EXPIRED]: 410,
  [WatchDenialReason.REPLAY_NOT_ON_SALE]: 403,
  [WatchDenialReason.PREVIEW_EXHAUSTED]: 403,
  [WatchDenialReason.CONCURRENT_LIMIT_REACHED]: 403,
  [WatchDenialReason.DATE_CANCELLED]: 403,
  [WatchDenialReason.NOT_PUBLISHED]: 403,
} satisfies Record<ErrorCode, ErrorStatus>;

export function statusOf(code: ErrorCode): ErrorStatus {
  return ERROR_STATUS[code];
}
