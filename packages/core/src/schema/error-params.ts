/**
 * The schema of each published code's `error.params`, code for code with `ErrorParamsMap`: what the
 * contract documents and the client reads.
 */

import { z } from 'zod';

import { int64 } from './primitives.js';
import { vocabularyOut } from './vocabulary.js';
import type { ErrorParamsMap, NoErrorParams, SchemaIssue } from '../kernel/error-params.js';
import { WatchDenialReason } from '../vocabulary/entitlement.js';
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
  SCHEMA_ISSUE_RULES,
  type ErrorCode,
} from '../vocabulary/error-codes.js';

/**
 * What a reader accepts for `C`. An unknown rule is kept raw (critical rule 10), and a code with
 * no params still reads one it does not know yet.
 */
export type ErrorParamsRead<C extends ErrorCode> = C extends typeof ApiErrorCode.SCHEMA_INVALID
  ? { issues: readonly (Omit<SchemaIssue, 'rule'> & { rule: string })[] }
  : NoErrorParams extends ErrorParamsMap[C]
    ? Readonly<Record<string, unknown>>
    : ErrorParamsMap[C];

const text = (): z.ZodString => z.string();
const count = (): z.ZodNumber => int64();
const list = (): z.ZodArray<z.ZodString> => z.array(z.string());
const none = (): z.ZodObject<Record<string, never>, z.core.$loose> => z.looseObject({});

const SchemaIssueOut = z.looseObject({
  path: z.array(z.union([z.string(), int64()])),
  rule: vocabularyOut(SCHEMA_ISSUE_RULES),
  minimum: z.number().exactOptional(),
  maximum: z.number().exactOptional(),
  inclusive: z.boolean().exactOptional(),
  format: z.string().exactOptional(),
  values: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).exactOptional(),
});

export const ERROR_PARAMS: { readonly [C in ErrorCode]: z.ZodType<ErrorParamsRead<C>> } = {
  [ApiErrorCode.UNAUTHENTICATED]: none(),
  [ApiErrorCode.TOKEN_EXPIRED]: none(),
  [ApiErrorCode.FORBIDDEN]: none(),
  [ApiErrorCode.NOT_FOUND]: none(),
  [ApiErrorCode.RATE_LIMITED]: z.looseObject({ retryAfterMs: count() }),
  [ApiErrorCode.SCHEMA_INVALID]: z.looseObject({ issues: z.array(SchemaIssueOut) }),
  [ApiErrorCode.INTERNAL]: none(),
  [ApiErrorCode.SERVICE_UNAVAILABLE]: none(),
  [ApiErrorCode.UPSTREAM_UNAVAILABLE]: z.looseObject({ service: text() }),
  [ApiErrorCode.CURSOR_TOO_OLD]: z.looseObject({ maxAgeHours: count() }),
  [ApiErrorCode.SORT_KEY_FORBIDDEN]: z.looseObject({ sortBy: text() }),
  [ApiErrorCode.PERIOD_FILTER_REQUIRED]: z.looseObject({ maxRangeDays: count() }),
  [ApiErrorCode.RIGHTS_VERSION_STALE]: z.looseObject({ currentRightsVersion: count() }),
  [ApiErrorCode.IDEMPOTENCY_KEY_REUSED]: none(),
  [ApiErrorCode.IDEMPOTENCY_IN_FLIGHT]: z.looseObject({ retryAfterMs: count() }),
  [ApiErrorCode.DEADLINE_EXCEEDED]: none(),
  [ApiErrorCode.UPSTREAM_TIMEOUT]: z.looseObject({ service: text() }),
  [ApiErrorCode.PAYLOAD_TOO_LARGE]: none(),
  [ApiErrorCode.UNSUPPORTED_MEDIA_TYPE]: none(),
  [ApiErrorCode.REAUTHENTICATION_REQUIRED]: none(),

  [IdentityErrorCode.EMAIL_TAKEN]: none(),
  [IdentityErrorCode.HANDLE_TAKEN]: none(),
  [IdentityErrorCode.INVALID_CREDENTIALS]: none(),
  [IdentityErrorCode.TWO_FACTOR_REQUIRED]: z.looseObject({ challengeId: text() }),
  [IdentityErrorCode.SIGNED_OUT_ELSEWHERE]: none(),
  [IdentityErrorCode.VERIFICATION_LINK_INVALID]: none(),

  [PairingErrorCode.SLOW_DOWN]: z.looseObject({ retryAfterMs: count() }),
  [PairingErrorCode.IDENTITY_MISMATCH]: none(),
  [PairingErrorCode.INTENT_NOT_ENGAGEABLE]: z.looseObject({ intent: text() }),
  [PairingErrorCode.EXECUTION_ENGAGED]: z.looseObject({ state: text(), engagedAt: text() }),

  [ChatErrorCode.HOLDERS_ONLY]: none(),
  [ChatErrorCode.RATE_LIMITED]: z.looseObject({ retryAfterMs: count() }),

  [ModerationErrorCode.ALREADY_CLAIMED]: z.looseObject({
    claimedBy: text(),
    claimExpiresAt: text(),
  }),
  [ModerationErrorCode.ALREADY_SETTLED]: z.looseObject({
    verdict: text(),
    settledBy: text(),
    settledAt: text(),
  }),
  [ModerationErrorCode.AUTOMATIC_CANNOT_OVERRIDE_HUMAN]: z.looseObject({
    existing: text(),
    incoming: text(),
  }),
  [ModerationErrorCode.DECISION_VERSION_STALE]: none(),

  [CatalogErrorCode.ARTIST_SLUG_TAKEN]: none(),
  [CatalogErrorCode.DATE_HAS_SOLD_SEATS]: z.looseObject({ seatsSold: count() }),
  [CatalogErrorCode.OUTCOME_DECISION_FORBIDDEN]: z.looseObject({ canEscalateTo: list() }),
  [CatalogErrorCode.PRICES_LOCKED]: z.looseObject({ lockedAt: text() }),
  [CatalogErrorCode.PRICES_CURRENCY_MISMATCH]: z.looseObject({
    tier: text(),
    currency: text(),
    expected: text(),
  }),
  [CatalogErrorCode.REPLAY_POLICY_FINAL]: z.looseObject({ currentPolicy: text() }),
  [CatalogErrorCode.TECHNICAL_CHECK_REQUIRED]: none(),
  [CatalogErrorCode.TECHNICAL_PROVISION_REQUIRED]: z.looseObject({
    threshold: count(),
    capacityTotal: count(),
    provisionedCapacity: count().exactOptional(),
    revisableUntil: text().exactOptional(),
  }),
  [CatalogErrorCode.PROVISION_DEADLINE_PASSED]: z.looseObject({ revisableUntil: text() }),
  [CatalogErrorCode.PROVISION_BELOW_CAPACITY]: z.looseObject({
    capacityTotal: count(),
    provisionedCapacity: count(),
  }),
  [CatalogErrorCode.STREAM_KEY_ROTATION_DURING_RUN]: z.looseObject({ runState: text() }),
  [CatalogErrorCode.POSTPONEMENT_LIMIT_REACHED]: z.looseObject({ max: count() }),
  [CatalogErrorCode.OUTCOME_FINAL]: z.looseObject({ outcome: text() }),
  [CatalogErrorCode.DATE_NOT_PUBLIC]: z.looseObject({ state: text() }),
  [CatalogErrorCode.DATE_ALREADY_STARTED]: z.looseObject({ startsAt: text() }),
  [CatalogErrorCode.DATE_NOT_STARTED]: z.looseObject({ startsAt: text() }),
  [CatalogErrorCode.DATE_ALREADY_ENDED]: z.looseObject({ endsAt: text() }),
  [CatalogErrorCode.RESCHEDULE_IN_PAST]: z.looseObject({ rescheduledTo: text() }),

  [ChannelErrorCode.CHANNEL_HAS_OPEN_OBLIGATIONS]: z.looseObject({
    datesOnSale: count(),
    payoutsDue: count(),
  }),
  [ChannelErrorCode.CREW_ROLE_RESERVED]: z.looseObject({
    crewRole: text(),
    reservedTo: list(),
    reasonCode: text(),
  }),
  [ChannelErrorCode.ROLE_NOT_ASSIGNABLE]: z.looseObject({
    assignableRoles: list(),
    contactRoles: list(),
  }),
  [ChannelErrorCode.TRANSFER_TARGET_INELIGIBLE]: z.looseObject({ reasonCode: text() }),
  [ChannelErrorCode.SAME_ACTOR_FORBIDDEN]: none(),

  [PayoutErrorCode.RECONCILIATION_DISCREPANCY_UNEXPLAINED]: z.looseObject({
    discrepancyMinor: count(),
    currencyCode: text(),
    payoutIds: list(),
  }),

  [OrderErrorCode.QUOTE_ADDRESS_MISMATCH]: z.looseObject({
    quotedCountryCode: text(),
    quotedPostalCode: text(),
  }),
  [OrderErrorCode.SOLD_OUT]: none(),
  [OrderErrorCode.PAYMENT_DECLINED]: z.looseObject({ declineCode: text() }),
  [OrderErrorCode.PRICE_STALE]: z.looseObject({
    expectedAmountMinor: count(),
    currentAmountMinor: count(),
    currencyCode: text(),
  }),
  [OrderErrorCode.PLAN_UNAVAILABLE]: none(),
  [OrderErrorCode.CONTRIBUTION_OUT_OF_RANGE]: none(),
  [OrderErrorCode.CHECKOUT_LINE_UNAVAILABLE]: none(),
  [OrderErrorCode.SALES_QUEUE_ADMISSION_REQUIRED]: z.looseObject({ dateId: text() }),
  [OrderErrorCode.LATE_ENTRY_UNACKNOWLEDGED]: z.looseObject({
    startedAt: text(),
    minutesElapsed: count(),
    salesEndAt: text(),
  }),
  [OrderErrorCode.SALES_CLOSED]: z.looseObject({ salesEndAt: text() }),
  [OrderErrorCode.SEAT_CANCEL_DEADLINE_PASSED]: none(),
  [OrderErrorCode.PAYMENT_METHOD_IN_USE]: none(),

  [DomainErrorCode.CAPACITY_TIER_MUST_WIDEN]: z.looseObject({ current: count(), next: count() }),
  [DomainErrorCode.CONTENT_EMPTY_IN_BOTH_LANGUAGES]: none(),
  [DomainErrorCode.HOLD_QUANTITY_INVALID]: z.looseObject({ quantity: text() }),
  [DomainErrorCode.MEDIA_SIZE_INVALID]: z.looseObject({ width: text(), height: text() }),
  [DomainErrorCode.MEDIA_URL_EMPTY]: none(),
  [DomainErrorCode.ORDER_QUANTITY_INVALID]: z.looseObject({ quantity: text() }),
  [DomainErrorCode.PAIRING_CODE_AMBIGUOUS_GLYPH]: z.looseObject({
    glyph: text(),
    position: count(),
  }),
  [DomainErrorCode.PUBLICATION_CHECKLIST_INCOMPLETE]: z.looseObject({ missing: list() }),
  [DomainErrorCode.PUBLICATION_PROMISE_UNACKNOWLEDGED]: z.looseObject({
    from: text(),
    to: text(),
    promise: text(),
  }),
  [DomainErrorCode.PUBLICATION_TRANSITION_FORBIDDEN]: z.looseObject({ from: text(), to: text() }),
  [DomainErrorCode.PUBLICATION_TRANSITION_IRREVERSIBLE]: z.looseObject({
    from: text(),
    to: text(),
    promise: text(),
  }),
  [DomainErrorCode.SEARCH_UNKNOWN_FLAG]: z.looseObject({ flag: text() }),
  [DomainErrorCode.SEAT_CODE_MALFORMED]: z.looseObject({ body: text() }),
  [DomainErrorCode.STATE_CONFLICT]: z.looseObject({
    currentVersion: count(),
    state: text()
      .meta({ description: 'Present when the record has a lifecycle state.' })
      .exactOptional(),
  }),

  [WatchDenialReason.NO_SEAT]: none(),
  [WatchDenialReason.ROOM_NOT_OPEN]: none(),
  [WatchDenialReason.OUT_OF_TERRITORY]: none(),
  [WatchDenialReason.SUBSCRIPTION_REQUIRED]: none(),
  [WatchDenialReason.NO_REPLAY]: none(),
  [WatchDenialReason.REPLAY_EXPIRED]: none(),
  [WatchDenialReason.REPLAY_NOT_ON_SALE]: none(),
  [WatchDenialReason.PREVIEW_EXHAUSTED]: none(),
  [WatchDenialReason.CONCURRENT_LIMIT_REACHED]: z.looseObject({
    allowed: count(),
    activeSessions: z.array(z.looseObject({})),
  }),
  [WatchDenialReason.DATE_CANCELLED]: none(),
  [WatchDenialReason.NOT_PUBLISHED]: none(),
};

export function errorParamsSchemaOf(code: ErrorCode): z.ZodType {
  return ERROR_PARAMS[code];
}
