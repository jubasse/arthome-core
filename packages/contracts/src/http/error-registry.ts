/**
 * One entry per error code: the status it is answered with (transport.md §5.5), an example of its
 * params, and its nature where it is not its status's, so a route's error responses are grouped
 * and illustrated from one place.
 */

import {
  ApiErrorCode,
  CatalogErrorCode,
  ChannelErrorCode,
  ChatErrorCode,
  CrewRole,
  DateOutcome,
  DomainConstant,
  DomainErrorCode,
  FailureNature,
  IdentityErrorCode,
  MemberRole,
  ModerationErrorCode,
  ModerationVerdict,
  OrderErrorCode,
  PairingErrorCode,
  PayoutErrorCode,
  PriceTier,
  PublicationChecklistItem,
  PublicationPromise,
  PublicationState,
  ReplayPolicy,
  RunState,
  SchemaIssueRule,
  Service,
  StateChangeOrigin,
  TECHNICAL_PROVISION_THRESHOLD,
  WatchDenialReason,
  type ErrorCode,
  type ErrorParamsOf,
} from '@arthome/core';

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
export const NATURE_BY_STATUS: Readonly<Record<ErrorStatus, FailureNature>> = {
  400: FailureNature.REFUSED,
  401: FailureNature.REFUSED,
  402: FailureNature.REFUSED,
  403: FailureNature.REFUSED,
  404: FailureNature.REFUSED,
  409: FailureNature.REFUSED,
  410: FailureNature.REFUSED,
  412: FailureNature.REFUSED,
  413: FailureNature.REFUSED,
  415: FailureNature.REFUSED,
  422: FailureNature.REFUSED,
  423: FailureNature.REFUSED,
  429: FailureNature.UNAVAILABLE,
  500: FailureNature.UNAVAILABLE,
  502: FailureNature.UNAVAILABLE,
  503: FailureNature.UNAVAILABLE,
  504: FailureNature.UNAVAILABLE,
};

const DATE_ID = '019928a0-7d31-7a10-b8c4-2f9e11a4c001';

export const ERRORS: { readonly [C in ErrorCode]: ErrorDefinition<C> } = {
  [ApiErrorCode.UNAUTHENTICATED]: { status: 401, example: {} },
  [ApiErrorCode.TOKEN_EXPIRED]: { status: 401, example: {} },
  [ApiErrorCode.FORBIDDEN]: { status: 403, example: {} },
  [ApiErrorCode.NOT_FOUND]: { status: 404, example: {} },
  [ApiErrorCode.RATE_LIMITED]: { status: 429, example: { retryAfterMs: 2000 } },
  [ApiErrorCode.SCHEMA_INVALID]: {
    status: 400,
    example: {
      issues: [
        { path: ['quantity'], rule: SchemaIssueRule.TOO_SMALL, minimum: 1, inclusive: true },
      ],
    },
  },
  [ApiErrorCode.INTERNAL]: { status: 500, example: {} },
  [ApiErrorCode.SERVICE_UNAVAILABLE]: { status: 503, example: {} },
  [ApiErrorCode.UPSTREAM_UNAVAILABLE]: { status: 502, example: { service: Service.CATALOG } },
  [ApiErrorCode.CURSOR_TOO_OLD]: { status: 410, example: { maxAgeHours: 24 } },
  [ApiErrorCode.SORT_KEY_FORBIDDEN]: { status: 403, example: { sortBy: 'grossRevenue' } },
  [ApiErrorCode.PERIOD_FILTER_REQUIRED]: { status: 400, example: { maxRangeDays: 92 } },
  [ApiErrorCode.RIGHTS_VERSION_STALE]: { status: 403, example: { currentRightsVersion: 412 } },
  [ApiErrorCode.IDEMPOTENCY_KEY_REUSED]: { status: 409, example: {} },
  // It carries `retryAfterMs`: the client is asked to retry, which a refusal never does.
  [ApiErrorCode.IDEMPOTENCY_IN_FLIGHT]: {
    status: 409,
    example: { retryAfterMs: 1000 },
    nature: FailureNature.UNAVAILABLE,
  },
  [ApiErrorCode.DEADLINE_EXCEEDED]: { status: 504, example: {} },
  [ApiErrorCode.UPSTREAM_TIMEOUT]: { status: 504, example: { service: Service.CATALOG } },
  [ApiErrorCode.PAYLOAD_TOO_LARGE]: { status: 413, example: {} },
  [ApiErrorCode.UNSUPPORTED_MEDIA_TYPE]: { status: 415, example: {} },
  [ApiErrorCode.REAUTHENTICATION_REQUIRED]: { status: 403, example: {} },

  [IdentityErrorCode.EMAIL_TAKEN]: { status: 409, example: {} },
  [IdentityErrorCode.HANDLE_TAKEN]: { status: 409, example: {} },
  [IdentityErrorCode.INVALID_CREDENTIALS]: { status: 401, example: {} },
  [IdentityErrorCode.TWO_FACTOR_REQUIRED]: { status: 401, example: { challengeId: 'chl_7ab2' } },
  [IdentityErrorCode.SIGNED_OUT_ELSEWHERE]: { status: 403, example: {} },
  [IdentityErrorCode.VERIFICATION_LINK_INVALID]: { status: 410, example: {} },

  [PairingErrorCode.SLOW_DOWN]: { status: 429, example: { retryAfterMs: 5000 } },
  [PairingErrorCode.IDENTITY_MISMATCH]: { status: 403, example: {} },
  [PairingErrorCode.INTENT_NOT_ENGAGEABLE]: { status: 403, example: { intent: 'signin' } },
  [PairingErrorCode.EXECUTION_ENGAGED]: {
    status: 409,
    example: { state: 'engaged', engagedAt: '2026-09-21T18:52:04Z' },
  },

  [ChatErrorCode.HOLDERS_ONLY]: { status: 403, example: {} },
  [ChatErrorCode.RATE_LIMITED]: { status: 429, example: { retryAfterMs: 3000 } },

  [ModerationErrorCode.ALREADY_CLAIMED]: {
    status: 409,
    example: { claimedBy: 'Yann P.', claimExpiresAt: '2026-09-21T19:32:00Z' },
  },
  [ModerationErrorCode.ALREADY_SETTLED]: {
    status: 409,
    example: {
      verdict: ModerationVerdict.REMOVE,
      settledBy: 'Yann P.',
      settledAt: '2026-09-21T19:31:18Z',
    },
  },
  [ModerationErrorCode.AUTOMATIC_CANNOT_OVERRIDE_HUMAN]: {
    status: 409,
    example: {
      existing: StateChangeOrigin.HUMAN_VERDICT,
      incoming: StateChangeOrigin.AUTOMATIC_FILTER,
    },
  },
  [ModerationErrorCode.DECISION_VERSION_STALE]: { status: 409, example: {} },

  [CatalogErrorCode.ARTIST_SLUG_TAKEN]: { status: 409, example: {} },
  [CatalogErrorCode.ARTIST_ALREADY_EXISTS]: { status: 409, example: {} },
  // The slug is the server's choice, and publishing again takes the next free one.
  [CatalogErrorCode.SHOW_SLUG_TAKEN]: {
    status: 409,
    example: {},
    nature: FailureNature.UNAVAILABLE,
  },
  [CatalogErrorCode.DATE_HAS_SOLD_SEATS]: { status: 409, example: { seatsSold: 174 } },
  [CatalogErrorCode.OUTCOME_DECISION_FORBIDDEN]: {
    status: 403,
    example: { canEscalateTo: [MemberRole.ARTIST, MemberRole.PRODUCTION] },
  },
  [CatalogErrorCode.PRICES_LOCKED]: { status: 409, example: { lockedAt: '2026-09-21T18:04:00Z' } },
  [CatalogErrorCode.PRICES_CURRENCY_MISMATCH]: {
    status: 409,
    example: { tier: PriceTier.REDUCED, currency: 'CHF', expected: 'EUR' },
  },
  [CatalogErrorCode.REPLAY_POLICY_FINAL]: {
    status: 409,
    example: { currentPolicy: ReplayPolicy.NONE },
  },
  [CatalogErrorCode.TECHNICAL_CHECK_REQUIRED]: { status: 409, example: {} },
  [CatalogErrorCode.TECHNICAL_PROVISION_REQUIRED]: {
    status: 409,
    example: {
      threshold: TECHNICAL_PROVISION_THRESHOLD,
      capacityTotal: 10050,
      revisableUntil: '2026-09-18T19:00:00Z',
    },
  },
  [CatalogErrorCode.PROVISION_DEADLINE_PASSED]: {
    status: 409,
    example: { revisableUntil: '2026-09-18T19:00:00Z' },
  },
  [CatalogErrorCode.PROVISION_BELOW_CAPACITY]: {
    status: 409,
    example: { capacityTotal: 12000, provisionedCapacity: 11000 },
  },
  [CatalogErrorCode.STREAM_KEY_ROTATION_DURING_RUN]: {
    status: 409,
    example: { runState: RunState.ON_AIR },
  },
  [CatalogErrorCode.POSTPONEMENT_LIMIT_REACHED]: {
    status: 409,
    example: { max: DomainConstant.POSTPONEMENTS_MAX },
  },
  [CatalogErrorCode.OUTCOME_FINAL]: { status: 409, example: { outcome: DateOutcome.CANCELLED } },
  [CatalogErrorCode.DATE_NOT_PUBLIC]: { status: 409, example: { state: PublicationState.DRAFT } },
  [CatalogErrorCode.DATE_ALREADY_STARTED]: {
    status: 409,
    example: { startsAt: '2026-11-04T19:30:00Z' },
  },
  [CatalogErrorCode.DATE_NOT_STARTED]: {
    status: 409,
    example: { startsAt: '2026-11-04T19:30:00Z' },
  },
  [CatalogErrorCode.DATE_ALREADY_ENDED]: {
    status: 409,
    example: { endsAt: '2026-11-04T21:05:00Z' },
  },
  [CatalogErrorCode.RESCHEDULE_IN_PAST]: {
    status: 400,
    example: { rescheduledTo: '2026-10-01T19:30:00Z' },
  },

  [ChannelErrorCode.CHANNEL_HAS_OPEN_OBLIGATIONS]: {
    status: 409,
    example: { datesOnSale: 3, payoutsDue: 1 },
  },
  [ChannelErrorCode.CREW_ROLE_RESERVED]: {
    status: 403,
    example: {
      crewRole: CrewRole.DIRECTOR,
      reservedTo: [MemberRole.ARTIST, MemberRole.PRODUCTION],
      reasonCode: 'grants_stream_key_access',
    },
  },
  [ChannelErrorCode.ROLE_NOT_ASSIGNABLE]: {
    status: 403,
    example: {
      assignableRoles: [CrewRole.VIDEO, CrewRole.SOUND],
      contactRoles: [MemberRole.ARTIST, MemberRole.PRODUCTION],
    },
  },
  [ChannelErrorCode.TRANSFER_TARGET_INELIGIBLE]: {
    status: 409,
    example: { reasonCode: 'two_factor_missing' },
  },
  [ChannelErrorCode.SAME_ACTOR_FORBIDDEN]: { status: 403, example: {} },

  [PayoutErrorCode.RECONCILIATION_DISCREPANCY_UNEXPLAINED]: {
    status: 409,
    example: {
      discrepancyMinor: -1240,
      currencyCode: 'EUR',
      payoutIds: ['019928e5-0000-7000-8000-000000000001'],
    },
  },

  [OrderErrorCode.QUOTE_ADDRESS_MISMATCH]: {
    status: 409,
    example: { quotedCountryCode: 'FR', quotedPostalCode: '75011' },
  },
  [OrderErrorCode.SOLD_OUT]: { status: 409, example: {} },
  [OrderErrorCode.TIER_UNAVAILABLE]: { status: 409, example: {} },
  // Declined by the payment provider, which is not a rule of ours refusing (commerce.ts).
  [OrderErrorCode.PAYMENT_DECLINED]: {
    status: 402,
    example: { declineCode: 'insufficient_funds' },
  },
  [OrderErrorCode.PRICE_STALE]: {
    status: 409,
    example: { expectedAmountMinor: 2400, currentAmountMinor: 2900, currencyCode: 'EUR' },
  },
  [OrderErrorCode.PLAN_UNAVAILABLE]: { status: 409, example: {} },
  [OrderErrorCode.CONTRIBUTION_OUT_OF_RANGE]: { status: 409, example: {} },
  [OrderErrorCode.CHECKOUT_LINE_UNAVAILABLE]: { status: 409, example: {} },
  [OrderErrorCode.SALES_QUEUE_ADMISSION_REQUIRED]: { status: 403, example: { dateId: DATE_ID } },
  [OrderErrorCode.LATE_ENTRY_UNACKNOWLEDGED]: {
    status: 409,
    example: {
      startedAt: '2026-11-04T19:30:00Z',
      minutesElapsed: 12,
      salesEndAt: '2026-11-04T20:00:00Z',
    },
  },
  [OrderErrorCode.SALES_CLOSED]: { status: 409, example: { salesEndAt: '2026-11-04T20:00:00Z' } },
  [OrderErrorCode.SEAT_CANCEL_DEADLINE_PASSED]: { status: 409, example: {} },
  [OrderErrorCode.PAYMENT_METHOD_IN_USE]: { status: 409, example: {} },

  [DomainErrorCode.CAPACITY_TIER_MUST_WIDEN]: { status: 409, example: { current: 500, next: 400 } },
  // Thrown on read only (`pickLanguage`): stored content breaking an invariant no client can fix.
  [DomainErrorCode.CONTENT_EMPTY_IN_BOTH_LANGUAGES]: { status: 500, example: {} },
  // A value its schema accepts and a rule refuses: 400, as `api.schema_invalid`.
  [DomainErrorCode.HOLD_QUANTITY_INVALID]: { status: 400, example: { quantity: '0' } },
  [DomainErrorCode.MEDIA_SIZE_INVALID]: { status: 400, example: { width: '0', height: '720' } },
  [DomainErrorCode.MEDIA_URL_EMPTY]: { status: 400, example: {} },
  [DomainErrorCode.ORDER_QUANTITY_INVALID]: { status: 400, example: { quantity: '0' } },
  [DomainErrorCode.PAIRING_CODE_AMBIGUOUS_GLYPH]: {
    status: 400,
    example: { glyph: '0', position: 4 },
  },
  [DomainErrorCode.PUBLICATION_CHECKLIST_INCOMPLETE]: {
    status: 409,
    example: {
      missing: [
        PublicationChecklistItem.POSTER,
        PublicationChecklistItem.AT_LEAST_ONE_ACTIVE_PRICE,
        PublicationChecklistItem.TECHNICAL_CHECK_PASSED,
      ],
    },
  },
  [DomainErrorCode.PUBLICATION_PROMISE_UNACKNOWLEDGED]: {
    status: 409,
    example: {
      from: PublicationState.DRAFT,
      to: PublicationState.SCHEDULED,
      promise: PublicationPromise.PRICES_ENGAGED,
    },
  },
  [DomainErrorCode.PUBLICATION_TRANSITION_FORBIDDEN]: {
    status: 409,
    example: { from: PublicationState.DRAFT, to: PublicationState.LIVE },
  },
  [DomainErrorCode.PUBLICATION_TRANSITION_IRREVERSIBLE]: {
    status: 409,
    example: {
      from: PublicationState.SCHEDULED,
      to: PublicationState.RESERVE,
      promise: PublicationPromise.PRICES_ENGAGED,
    },
  },
  [DomainErrorCode.SEARCH_UNKNOWN_FLAG]: { status: 400, example: { flag: 'subtitled' } },
  [DomainErrorCode.SEAT_CODE_MALFORMED]: { status: 400, example: { body: 'A12' } },
  [DomainErrorCode.STATE_CONFLICT]: {
    status: 409,
    example: { currentVersion: 8, state: PublicationState.LIVE },
  },

  [WatchDenialReason.NO_SEAT]: { status: 403, example: {} },
  [WatchDenialReason.ROOM_NOT_OPEN]: { status: 403, example: {} },
  [WatchDenialReason.OUT_OF_TERRITORY]: { status: 403, example: {} },
  [WatchDenialReason.SUBSCRIPTION_REQUIRED]: { status: 403, example: {} },
  [WatchDenialReason.NO_REPLAY]: { status: 403, example: {} },
  [WatchDenialReason.REPLAY_EXPIRED]: { status: 410, example: {} },
  [WatchDenialReason.REPLAY_NOT_ON_SALE]: { status: 403, example: {} },
  [WatchDenialReason.PREVIEW_EXHAUSTED]: { status: 403, example: {} },
  [WatchDenialReason.CONCURRENT_LIMIT_REACHED]: {
    status: 403,
    example: {
      allowed: 2,
      activeSessions: [
        {
          sessionId: '019928f7-0000-7000-8000-0000000000aa',
          deviceId: '019928f4-1b6c-7c3a-9f2e-6a1d0c4b8e77',
          deviceLabel: 'Téléviseur du salon',
          city: 'Paris',
          openedAt: '2026-09-21T19:00:00Z',
          isCurrentDevice: false,
        },
      ],
    },
  },
  [WatchDenialReason.DATE_CANCELLED]: { status: 403, example: {} },
  [WatchDenialReason.NOT_PUBLISHED]: { status: 403, example: {} },
};

export function statusOf<C extends ErrorCode>(code: C): ErrorStatusMap[C] {
  return ERRORS[code].status;
}

export function exampleOf<C extends ErrorCode>(code: C): ErrorParamsOf<C> {
  return ERRORS[code].example;
}

export function natureOf(code: ErrorCode): FailureNature {
  const { status, nature } = ERRORS[code];
  return nature ?? NATURE_BY_STATUS[status];
}
