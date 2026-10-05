/**
 * One entry per error code: the status it is answered with (transport.md §5.5), an example of its
 * params, and its nature where it is not its status's, so a route's error responses are grouped
 * and illustrated from one place.
 */
import { ApiErrorCode, CatalogErrorCode, ChannelErrorCode, ChatErrorCode, DomainErrorCode, FailureNature, IdentityErrorCode, ModerationErrorCode, OrderErrorCode, PairingErrorCode, PayoutErrorCode, WatchDenialReason, type ErrorCode, type ErrorParamsOf } from '@arthome/core';
import type { ErrorStatus } from './errors.js';
/**
 * The status of each code, as a type, so a route's codes are grouped by status at compile time.
 * `ERRORS` is held to it entry by entry: `isolatedDeclarations` cannot infer the table's literals.
 */
export interface ErrorStatusMap {
    readonly [ApiErrorCode.UNAUTHENTICATED]: 401;
    readonly [ApiErrorCode.TOKEN_EXPIRED]: 401;
    readonly [ApiErrorCode.FORBIDDEN]: 403;
    readonly [ApiErrorCode.NOT_FOUND]: 404;
    readonly [ApiErrorCode.RATE_LIMITED]: 429;
    readonly [ApiErrorCode.SCHEMA_INVALID]: 400;
    readonly [ApiErrorCode.INTERNAL]: 500;
    readonly [ApiErrorCode.SERVICE_UNAVAILABLE]: 503;
    readonly [ApiErrorCode.UPSTREAM_UNAVAILABLE]: 502;
    readonly [ApiErrorCode.CURSOR_TOO_OLD]: 410;
    readonly [ApiErrorCode.SORT_KEY_FORBIDDEN]: 403;
    readonly [ApiErrorCode.PERIOD_FILTER_REQUIRED]: 400;
    readonly [ApiErrorCode.RIGHTS_VERSION_STALE]: 403;
    readonly [ApiErrorCode.IDEMPOTENCY_KEY_REUSED]: 409;
    readonly [ApiErrorCode.IDEMPOTENCY_IN_FLIGHT]: 409;
    readonly [ApiErrorCode.DEADLINE_EXCEEDED]: 504;
    readonly [ApiErrorCode.UPSTREAM_TIMEOUT]: 504;
    readonly [ApiErrorCode.PAYLOAD_TOO_LARGE]: 413;
    readonly [ApiErrorCode.UNSUPPORTED_MEDIA_TYPE]: 415;
    readonly [ApiErrorCode.REAUTHENTICATION_REQUIRED]: 403;
    readonly [IdentityErrorCode.EMAIL_TAKEN]: 409;
    readonly [IdentityErrorCode.HANDLE_TAKEN]: 409;
    readonly [IdentityErrorCode.INVALID_CREDENTIALS]: 401;
    readonly [IdentityErrorCode.TWO_FACTOR_REQUIRED]: 401;
    readonly [IdentityErrorCode.SIGNED_OUT_ELSEWHERE]: 403;
    readonly [IdentityErrorCode.VERIFICATION_LINK_INVALID]: 410;
    readonly [IdentityErrorCode.RESET_TOKEN_EXPIRED]: 410;
    readonly [IdentityErrorCode.ONE_TIME_TOKEN_EXPIRED]: 410;
    readonly [IdentityErrorCode.TWO_FACTOR_CHALLENGE_EXPIRED]: 410;
    readonly [PairingErrorCode.SLOW_DOWN]: 429;
    readonly [PairingErrorCode.IDENTITY_MISMATCH]: 403;
    readonly [PairingErrorCode.INTENT_NOT_ENGAGEABLE]: 403;
    readonly [PairingErrorCode.EXECUTION_ENGAGED]: 409;
    readonly [ChatErrorCode.HOLDERS_ONLY]: 403;
    readonly [ChatErrorCode.RATE_LIMITED]: 429;
    readonly [ModerationErrorCode.ALREADY_CLAIMED]: 409;
    readonly [ModerationErrorCode.ALREADY_SETTLED]: 409;
    readonly [ModerationErrorCode.AUTOMATIC_CANNOT_OVERRIDE_HUMAN]: 409;
    readonly [ModerationErrorCode.DECISION_VERSION_STALE]: 409;
    readonly [CatalogErrorCode.ARTIST_SLUG_TAKEN]: 409;
    readonly [CatalogErrorCode.ARTIST_ALREADY_EXISTS]: 409;
    readonly [CatalogErrorCode.SHOW_SLUG_TAKEN]: 409;
    readonly [CatalogErrorCode.DATE_HAS_SOLD_SEATS]: 409;
    readonly [CatalogErrorCode.OUTCOME_DECISION_FORBIDDEN]: 403;
    readonly [CatalogErrorCode.PRICES_LOCKED]: 409;
    readonly [CatalogErrorCode.PRICES_CURRENCY_MISMATCH]: 409;
    readonly [CatalogErrorCode.REPLAY_POLICY_FINAL]: 409;
    readonly [CatalogErrorCode.TECHNICAL_CHECK_REQUIRED]: 409;
    readonly [CatalogErrorCode.TECHNICAL_PROVISION_REQUIRED]: 409;
    readonly [CatalogErrorCode.PROVISION_DEADLINE_PASSED]: 409;
    readonly [CatalogErrorCode.PROVISION_BELOW_CAPACITY]: 409;
    readonly [CatalogErrorCode.STREAM_KEY_ROTATION_DURING_RUN]: 409;
    readonly [CatalogErrorCode.POSTPONEMENT_LIMIT_REACHED]: 409;
    readonly [CatalogErrorCode.OUTCOME_FINAL]: 409;
    readonly [CatalogErrorCode.DATE_NOT_PUBLIC]: 409;
    readonly [CatalogErrorCode.DATE_ALREADY_STARTED]: 409;
    readonly [CatalogErrorCode.DATE_NOT_STARTED]: 409;
    readonly [CatalogErrorCode.DATE_ALREADY_ENDED]: 409;
    readonly [CatalogErrorCode.RESCHEDULE_IN_PAST]: 400;
    readonly [ChannelErrorCode.CHANNEL_HAS_OPEN_OBLIGATIONS]: 409;
    readonly [ChannelErrorCode.CREW_ROLE_RESERVED]: 403;
    readonly [ChannelErrorCode.ROLE_NOT_ASSIGNABLE]: 403;
    readonly [ChannelErrorCode.TRANSFER_TARGET_INELIGIBLE]: 409;
    readonly [ChannelErrorCode.SAME_ACTOR_FORBIDDEN]: 403;
    readonly [PayoutErrorCode.RECONCILIATION_DISCREPANCY_UNEXPLAINED]: 409;
    readonly [OrderErrorCode.QUOTE_ADDRESS_MISMATCH]: 409;
    readonly [OrderErrorCode.SOLD_OUT]: 409;
    readonly [OrderErrorCode.TIER_UNAVAILABLE]: 409;
    readonly [OrderErrorCode.PAYMENT_DECLINED]: 402;
    readonly [OrderErrorCode.PRICE_STALE]: 409;
    readonly [OrderErrorCode.PLAN_UNAVAILABLE]: 409;
    readonly [OrderErrorCode.CONTRIBUTION_OUT_OF_RANGE]: 409;
    readonly [OrderErrorCode.CHECKOUT_LINE_UNAVAILABLE]: 409;
    readonly [OrderErrorCode.SALES_QUEUE_ADMISSION_REQUIRED]: 403;
    readonly [OrderErrorCode.LATE_ENTRY_UNACKNOWLEDGED]: 409;
    readonly [OrderErrorCode.SALES_CLOSED]: 409;
    readonly [OrderErrorCode.SEAT_CANCEL_DEADLINE_PASSED]: 409;
    readonly [OrderErrorCode.PAYMENT_METHOD_IN_USE]: 409;
    readonly [DomainErrorCode.CAPACITY_TIER_MUST_WIDEN]: 409;
    readonly [DomainErrorCode.CONTENT_EMPTY_IN_BOTH_LANGUAGES]: 500;
    readonly [DomainErrorCode.HOLD_QUANTITY_INVALID]: 400;
    readonly [DomainErrorCode.MEDIA_SIZE_INVALID]: 400;
    readonly [DomainErrorCode.MEDIA_URL_EMPTY]: 400;
    readonly [DomainErrorCode.ORDER_QUANTITY_INVALID]: 400;
    readonly [DomainErrorCode.PAIRING_CODE_AMBIGUOUS_GLYPH]: 400;
    readonly [DomainErrorCode.PUBLICATION_CHECKLIST_INCOMPLETE]: 409;
    readonly [DomainErrorCode.PUBLICATION_PROMISE_UNACKNOWLEDGED]: 409;
    readonly [DomainErrorCode.PUBLICATION_TRANSITION_FORBIDDEN]: 409;
    readonly [DomainErrorCode.PUBLICATION_TRANSITION_IRREVERSIBLE]: 409;
    readonly [DomainErrorCode.SEARCH_UNKNOWN_FLAG]: 400;
    readonly [DomainErrorCode.SEAT_CODE_MALFORMED]: 400;
    readonly [DomainErrorCode.STATE_CONFLICT]: 409;
    readonly [WatchDenialReason.NO_SEAT]: 403;
    readonly [WatchDenialReason.ROOM_NOT_OPEN]: 403;
    readonly [WatchDenialReason.OUT_OF_TERRITORY]: 403;
    readonly [WatchDenialReason.SUBSCRIPTION_REQUIRED]: 403;
    readonly [WatchDenialReason.NO_REPLAY]: 403;
    readonly [WatchDenialReason.REPLAY_EXPIRED]: 410;
    readonly [WatchDenialReason.REPLAY_NOT_ON_SALE]: 403;
    readonly [WatchDenialReason.PREVIEW_EXHAUSTED]: 403;
    readonly [WatchDenialReason.CONCURRENT_LIMIT_REACHED]: 403;
    readonly [WatchDenialReason.DATE_CANCELLED]: 403;
    readonly [WatchDenialReason.NOT_PUBLISHED]: 403;
}
export interface ErrorDefinition<C extends ErrorCode = ErrorCode> {
    readonly status: ErrorStatusMap[C];
    readonly example: ErrorParamsOf<C>;
    /** Only where it differs from `NATURE_BY_STATUS`. */
    readonly nature?: FailureNature;
}
/** transport.md §5.5: a 4xx is refused, except 429; a 5xx is unavailable. */
export declare const NATURE_BY_STATUS: Readonly<Record<ErrorStatus, FailureNature>>;
export declare const ERRORS: {
    readonly [C in ErrorCode]: ErrorDefinition<C>;
};
export declare function statusOf<C extends ErrorCode>(code: C): ErrorStatusMap[C];
export declare function exampleOf<C extends ErrorCode>(code: C): ErrorParamsOf<C>;
export declare function natureOf(code: ErrorCode): FailureNature;
//# sourceMappingURL=error-registry.d.ts.map