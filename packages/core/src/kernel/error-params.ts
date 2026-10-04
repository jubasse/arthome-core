/**
 * What each error code carries in `error.params`, for every code a `DomainError` can carry: read
 * by the contract (which documents it), the server (which builds it) and the client (which
 * receives it typed). `ERROR_PARAMS` in `@arthome/core/schema` is its schema, code for code.
 */

import type { WatchDenialReason } from '../vocabulary/entitlement.js';
import type {
  ApiErrorCode,
  CatalogErrorCode,
  ChannelErrorCode,
  ChatErrorCode,
  DomainErrorCode,
  DomainGuardCode,
  IdentityErrorCode,
  ModerationErrorCode,
  OrderErrorCode,
  PairingErrorCode,
  PayoutErrorCode,
  ErrorCode,
  SchemaIssueRule,
} from '../vocabulary/error-codes.js';

/** Every code a `DomainError` can carry: the published codes and the domain's internal guards. */
export type RaisableErrorCode = ErrorCode | DomainGuardCode;

/** The params of a code that carries none: no key at all, rather than a loose record. */
export type NoErrorParams = Readonly<Record<string, never>>;

/**
 * One field of a request that failed its schema. `path` locates it (`['items', 0, 'quantity']`);
 * the limit the rule names travels with it: `minimum` for `too_small`, `maximum` for `too_big`,
 * both with `inclusive` (`false`: the limit itself is refused), `format` for `invalid_format`,
 * `values` for `invalid_value`.
 */
export interface SchemaIssue {
  readonly path: readonly (string | number)[];
  readonly rule: SchemaIssueRule;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly inclusive?: boolean;
  readonly format?: string;
  readonly values?: readonly (string | number | boolean | null)[];
}

export interface ErrorParamsMap {
  [ApiErrorCode.UNAUTHENTICATED]: NoErrorParams;
  [ApiErrorCode.TOKEN_EXPIRED]: NoErrorParams;
  [ApiErrorCode.FORBIDDEN]: NoErrorParams;
  [ApiErrorCode.NOT_FOUND]: NoErrorParams;
  [ApiErrorCode.RATE_LIMITED]: { retryAfterMs: number };
  [ApiErrorCode.SCHEMA_INVALID]: { issues: readonly SchemaIssue[] };
  [ApiErrorCode.INTERNAL]: NoErrorParams;
  [ApiErrorCode.SERVICE_UNAVAILABLE]: NoErrorParams;
  [ApiErrorCode.UPSTREAM_UNAVAILABLE]: { service: string };
  [ApiErrorCode.CURSOR_TOO_OLD]: { maxAgeHours: number };
  [ApiErrorCode.SORT_KEY_FORBIDDEN]: { sortBy: string };
  [ApiErrorCode.PERIOD_FILTER_REQUIRED]: { maxRangeDays: number };
  [ApiErrorCode.RIGHTS_VERSION_STALE]: { currentRightsVersion: number };
  [ApiErrorCode.IDEMPOTENCY_KEY_REUSED]: NoErrorParams;
  [ApiErrorCode.IDEMPOTENCY_IN_FLIGHT]: { retryAfterMs: number };
  [ApiErrorCode.DEADLINE_EXCEEDED]: NoErrorParams;
  [ApiErrorCode.UPSTREAM_TIMEOUT]: { service: string };
  [ApiErrorCode.PAYLOAD_TOO_LARGE]: NoErrorParams;
  [ApiErrorCode.UNSUPPORTED_MEDIA_TYPE]: NoErrorParams;
  [ApiErrorCode.REAUTHENTICATION_REQUIRED]: NoErrorParams;

  [IdentityErrorCode.EMAIL_TAKEN]: NoErrorParams;
  [IdentityErrorCode.HANDLE_TAKEN]: NoErrorParams;
  [IdentityErrorCode.INVALID_CREDENTIALS]: NoErrorParams;
  [IdentityErrorCode.TWO_FACTOR_REQUIRED]: { challengeId: string };
  [IdentityErrorCode.SIGNED_OUT_ELSEWHERE]: NoErrorParams;
  [IdentityErrorCode.VERIFICATION_LINK_INVALID]: NoErrorParams;

  [PairingErrorCode.SLOW_DOWN]: { retryAfterMs: number };
  [PairingErrorCode.IDENTITY_MISMATCH]: NoErrorParams;
  [PairingErrorCode.INTENT_NOT_ENGAGEABLE]: { intent: string };
  [PairingErrorCode.EXECUTION_ENGAGED]: { state: string; engagedAt: string };

  [ChatErrorCode.HOLDERS_ONLY]: NoErrorParams;
  [ChatErrorCode.RATE_LIMITED]: { retryAfterMs: number };

  [ModerationErrorCode.ALREADY_CLAIMED]: { claimedBy: string; claimExpiresAt: string };
  [ModerationErrorCode.ALREADY_SETTLED]: { verdict: string; settledBy: string; settledAt: string };
  [ModerationErrorCode.AUTOMATIC_CANNOT_OVERRIDE_HUMAN]: { existing: string; incoming: string };
  [ModerationErrorCode.DECISION_VERSION_STALE]: NoErrorParams;

  [CatalogErrorCode.ARTIST_SLUG_TAKEN]: NoErrorParams;
  [CatalogErrorCode.DATE_HAS_SOLD_SEATS]: { seatsSold: number };
  [CatalogErrorCode.OUTCOME_DECISION_FORBIDDEN]: { canEscalateTo: string[] };
  [CatalogErrorCode.PRICES_LOCKED]: { lockedAt: string };
  [CatalogErrorCode.PRICES_CURRENCY_MISMATCH]: { tier: string; currency: string; expected: string };
  [CatalogErrorCode.REPLAY_POLICY_FINAL]: { currentPolicy: string };
  [CatalogErrorCode.TECHNICAL_CHECK_REQUIRED]: NoErrorParams;
  // No deadline while the date has no start; the provision, when one is recorded and too small.
  [CatalogErrorCode.TECHNICAL_PROVISION_REQUIRED]: {
    threshold: number;
    capacityTotal: number;
    provisionedCapacity?: number;
    revisableUntil?: string;
  };
  [CatalogErrorCode.PROVISION_DEADLINE_PASSED]: { revisableUntil: string };
  [CatalogErrorCode.PROVISION_BELOW_CAPACITY]: {
    capacityTotal: number;
    provisionedCapacity: number;
  };
  [CatalogErrorCode.STREAM_KEY_ROTATION_DURING_RUN]: { runState: string };
  [CatalogErrorCode.POSTPONEMENT_LIMIT_REACHED]: { max: number };

  [ChannelErrorCode.CHANNEL_HAS_OPEN_OBLIGATIONS]: { datesOnSale: number; payoutsDue: number };
  [ChannelErrorCode.CREW_ROLE_RESERVED]: {
    crewRole: string;
    reservedTo: string[];
    reasonCode: string;
  };
  [ChannelErrorCode.ROLE_NOT_ASSIGNABLE]: { assignableRoles: string[]; contactRoles: string[] };
  [ChannelErrorCode.TRANSFER_TARGET_INELIGIBLE]: { reasonCode: string };
  [ChannelErrorCode.SAME_ACTOR_FORBIDDEN]: NoErrorParams;

  [PayoutErrorCode.RECONCILIATION_DISCREPANCY_UNEXPLAINED]: {
    discrepancyMinor: number;
    currencyCode: string;
    payoutIds: string[];
  };

  [OrderErrorCode.QUOTE_ADDRESS_MISMATCH]: { quotedCountryCode: string; quotedPostalCode: string };
  [OrderErrorCode.SOLD_OUT]: NoErrorParams;
  [OrderErrorCode.PAYMENT_DECLINED]: { declineCode: string };
  [OrderErrorCode.PRICE_STALE]: {
    expectedAmountMinor: number;
    currentAmountMinor: number;
    currencyCode: string;
  };
  [OrderErrorCode.PLAN_UNAVAILABLE]: NoErrorParams;
  [OrderErrorCode.CONTRIBUTION_OUT_OF_RANGE]: NoErrorParams;
  [OrderErrorCode.CHECKOUT_LINE_UNAVAILABLE]: NoErrorParams;
  [OrderErrorCode.SALES_QUEUE_ADMISSION_REQUIRED]: { dateId: string };
  [OrderErrorCode.LATE_ENTRY_UNACKNOWLEDGED]: {
    startedAt: string;
    minutesElapsed: number;
    salesEndAt: string;
  };
  [OrderErrorCode.SALES_CLOSED]: { salesEndAt: string };
  [OrderErrorCode.SEAT_CANCEL_DEADLINE_PASSED]: NoErrorParams;
  [OrderErrorCode.PAYMENT_METHOD_IN_USE]: NoErrorParams;

  [DomainErrorCode.CAPACITY_TIER_MUST_WIDEN]: { current: number; next: number };
  [DomainErrorCode.CONTENT_EMPTY_IN_BOTH_LANGUAGES]: NoErrorParams;
  // An invalid number is echoed as a string: it may be one JSON cannot carry (NaN, Infinity).
  [DomainErrorCode.HOLD_QUANTITY_INVALID]: { quantity: string };
  [DomainErrorCode.MEDIA_SIZE_INVALID]: { width: string; height: string };
  [DomainErrorCode.MEDIA_URL_EMPTY]: NoErrorParams;
  [DomainErrorCode.ORDER_QUANTITY_INVALID]: { quantity: string };
  [DomainErrorCode.PAIRING_CODE_AMBIGUOUS_GLYPH]: { glyph: string; position: number };
  [DomainErrorCode.PUBLICATION_CHECKLIST_INCOMPLETE]: { missing: string[] };
  [DomainErrorCode.PUBLICATION_PROMISE_UNACKNOWLEDGED]: {
    from: string;
    to: string;
    promise: string;
  };
  [DomainErrorCode.PUBLICATION_TRANSITION_FORBIDDEN]: { from: string; to: string };
  [DomainErrorCode.PUBLICATION_TRANSITION_IRREVERSIBLE]: {
    from: string;
    to: string;
    promise: string;
  };
  [DomainErrorCode.SEARCH_UNKNOWN_FLAG]: { flag: string };
  [DomainErrorCode.SEAT_CODE_MALFORMED]: { body: string };
  // A version conflict names the current version; a declaration that does not fit the state of
  //   the date names what it met instead (catalog/outcome.ts), so each fact is optional.
  [DomainErrorCode.STATE_CONFLICT]: {
    currentVersion?: number;
    state?: string;
    outcome?: string;
    startsAt?: string;
  };

  [WatchDenialReason.NO_SEAT]: NoErrorParams;
  [WatchDenialReason.ROOM_NOT_OPEN]: NoErrorParams;
  [WatchDenialReason.OUT_OF_TERRITORY]: NoErrorParams;
  [WatchDenialReason.SUBSCRIPTION_REQUIRED]: NoErrorParams;
  [WatchDenialReason.NO_REPLAY]: NoErrorParams;
  [WatchDenialReason.REPLAY_EXPIRED]: NoErrorParams;
  [WatchDenialReason.REPLAY_NOT_ON_SALE]: NoErrorParams;
  [WatchDenialReason.PREVIEW_EXHAUSTED]: NoErrorParams;
  [WatchDenialReason.CONCURRENT_LIMIT_REACHED]: { allowed: number; activeSessions: unknown[] };
  [WatchDenialReason.DATE_CANCELLED]: NoErrorParams;
  [WatchDenialReason.NOT_PUBLISHED]: NoErrorParams;

  [DomainGuardCode.I18N_KEY_MALFORMED]: { key: string };
  [DomainGuardCode.INSTANT_INVALID]: { instant: string };
  [DomainGuardCode.MONEY_AMOUNT_NOT_INTEGER]: { amount: string };
  [DomainGuardCode.MONEY_COUNT_INVALID]: { count: string };
  [DomainGuardCode.MONEY_CURRENCY_INVALID]: { currency: string };
  [DomainGuardCode.MONEY_CURRENCY_MISMATCH]: { left: string; right: string };
  [DomainGuardCode.RATE_INVALID]: { rate: string };
  [DomainGuardCode.TIMEZONE_NOT_IANA]: { timeZone: string };
  [DomainGuardCode.TIMEZONE_OFFSET_OUT_OF_RANGE]: { offset: string };
  [DomainGuardCode.WINDOW_END_BEFORE_START]: { start: string; end: string };
}

/** Indexing by every raisable code is what makes a code without an entry fail to compile. */
export type ErrorParamsOf<C extends RaisableErrorCode> = ErrorParamsMap[C];
