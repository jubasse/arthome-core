/**
 * What each error code carries in `error.params`: one schema per code, read by the contract (which
 * documents it), the server (which builds it) and the client (which receives it typed). A code
 * absent here carries no parameter, or none the contract promises.
 */

import { z } from 'zod';

import { int64 } from './primitives.js';
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
  type ErrorCode,
} from '../vocabulary/error-codes.js';

export interface ErrorParamsMap {
  [ApiErrorCode.CURSOR_TOO_OLD]: { maxAgeHours: number };
  [ApiErrorCode.PERIOD_FILTER_REQUIRED]: { maxRangeDays: number };
  [ApiErrorCode.RATE_LIMITED]: { retryAfterMs: number };
  [ApiErrorCode.RIGHTS_VERSION_STALE]: { currentRightsVersion: number };
  [ApiErrorCode.SCHEMA_INVALID]: { fields: string[] };
  [ApiErrorCode.SORT_KEY_FORBIDDEN]: { sortBy: string };
  [ApiErrorCode.UPSTREAM_UNAVAILABLE]: { service: string };
  [ChannelErrorCode.CREW_ROLE_RESERVED]: {
    crewRole: string;
    reservedTo: string[];
    reasonCode: string;
  };
  [ChannelErrorCode.CHANNEL_HAS_OPEN_OBLIGATIONS]: { datesOnSale: number; payoutsDue: number };
  [ChannelErrorCode.ROLE_NOT_ASSIGNABLE]: { assignableRoles: string[]; contactRoles: string[] };
  [ChannelErrorCode.TRANSFER_TARGET_INELIGIBLE]: { reasonCode: string };
  [ChatErrorCode.RATE_LIMITED]: { retryAfterMs: number };
  [CatalogErrorCode.DATE_HAS_SOLD_SEATS]: { seatsSold: number };
  [CatalogErrorCode.OUTCOME_DECISION_FORBIDDEN]: { canEscalateTo: string[] };
  [CatalogErrorCode.PRICES_LOCKED]: { lockedAt: string };
  [CatalogErrorCode.PROVISION_DEADLINE_PASSED]: { revisableUntil: string };
  [CatalogErrorCode.REPLAY_POLICY_FINAL]: { currentPolicy: string };
  [CatalogErrorCode.STREAM_KEY_ROTATION_DURING_RUN]: { runState: string };
  [CatalogErrorCode.TECHNICAL_PROVISION_REQUIRED]: {
    threshold: number;
    capacityTotal: number;
    revisableUntil: string;
  };
  [IdentityErrorCode.TWO_FACTOR_REQUIRED]: { challengeId: string };
  [ModerationErrorCode.ALREADY_CLAIMED]: { claimedBy: string; claimExpiresAt: string };
  [ModerationErrorCode.ALREADY_SETTLED]: { verdict: string; settledBy: string; settledAt: string };
  [OrderErrorCode.PAYMENT_DECLINED]: { declineCode: string };
  [OrderErrorCode.PRICE_STALE]: {
    expectedAmountMinor: number;
    currentAmountMinor: number;
    currencyCode: string;
  };
  [OrderErrorCode.QUOTE_ADDRESS_MISMATCH]: { quotedCountryCode: string; quotedPostalCode: string };
  [OrderErrorCode.SALES_QUEUE_ADMISSION_REQUIRED]: { dateId: string };
  [PairingErrorCode.EXECUTION_ENGAGED]: { state: string; engagedAt: string };
  [PairingErrorCode.INTENT_NOT_ENGAGEABLE]: { intent: string };
  [PairingErrorCode.SLOW_DOWN]: { retryAfterMs: number };
  [PayoutErrorCode.RECONCILIATION_DISCREPANCY_UNEXPLAINED]: {
    discrepancyMinor: number;
    currencyCode: string;
    payoutIds: string[];
  };
  [DomainErrorCode.PUBLICATION_CHECKLIST_INCOMPLETE]: { missing: string[] };
  [DomainErrorCode.STATE_CONFLICT]: { currentVersion: number };
  [WatchDenialReason.CONCURRENT_LIMIT_REACHED]: { allowed: number; activeSessions: unknown[] };
}

export type ErrorParamsOf<C extends string> = C extends keyof ErrorParamsMap
  ? ErrorParamsMap[C]
  : Readonly<Record<string, unknown>>;

const text = (): z.ZodString => z.string();
const count = (): z.ZodNumber => int64();
const list = (): z.ZodArray<z.ZodString> => z.array(z.string());

export const ERROR_PARAMS: { readonly [C in keyof ErrorParamsMap]: z.ZodType<ErrorParamsMap[C]> } =
  {
    [ApiErrorCode.CURSOR_TOO_OLD]: z.looseObject({ maxAgeHours: count() }),
    [ApiErrorCode.PERIOD_FILTER_REQUIRED]: z.looseObject({ maxRangeDays: count() }),
    [ApiErrorCode.RATE_LIMITED]: z.looseObject({ retryAfterMs: count() }),
    [ApiErrorCode.RIGHTS_VERSION_STALE]: z.looseObject({ currentRightsVersion: count() }),
    [ApiErrorCode.SCHEMA_INVALID]: z.looseObject({ fields: list() }),
    [ApiErrorCode.SORT_KEY_FORBIDDEN]: z.looseObject({ sortBy: text() }),
    [ApiErrorCode.UPSTREAM_UNAVAILABLE]: z.looseObject({ service: text() }),
    [ChannelErrorCode.CREW_ROLE_RESERVED]: z.looseObject({
      crewRole: text(),
      reservedTo: list(),
      reasonCode: text(),
    }),
    [ChannelErrorCode.CHANNEL_HAS_OPEN_OBLIGATIONS]: z.looseObject({
      datesOnSale: count(),
      payoutsDue: count(),
    }),
    [ChannelErrorCode.ROLE_NOT_ASSIGNABLE]: z.looseObject({
      assignableRoles: list(),
      contactRoles: list(),
    }),
    [ChannelErrorCode.TRANSFER_TARGET_INELIGIBLE]: z.looseObject({ reasonCode: text() }),
    [ChatErrorCode.RATE_LIMITED]: z.looseObject({ retryAfterMs: count() }),
    [CatalogErrorCode.DATE_HAS_SOLD_SEATS]: z.looseObject({ seatsSold: count() }),
    [CatalogErrorCode.OUTCOME_DECISION_FORBIDDEN]: z.looseObject({ canEscalateTo: list() }),
    [CatalogErrorCode.PRICES_LOCKED]: z.looseObject({ lockedAt: text() }),
    [CatalogErrorCode.PROVISION_DEADLINE_PASSED]: z.looseObject({ revisableUntil: text() }),
    [CatalogErrorCode.REPLAY_POLICY_FINAL]: z.looseObject({ currentPolicy: text() }),
    [CatalogErrorCode.STREAM_KEY_ROTATION_DURING_RUN]: z.looseObject({ runState: text() }),
    [CatalogErrorCode.TECHNICAL_PROVISION_REQUIRED]: z.looseObject({
      threshold: count(),
      capacityTotal: count(),
      revisableUntil: text(),
    }),
    [IdentityErrorCode.TWO_FACTOR_REQUIRED]: z.looseObject({ challengeId: text() }),
    [ModerationErrorCode.ALREADY_CLAIMED]: z.looseObject({
      claimedBy: text(),
      claimExpiresAt: text(),
    }),
    [ModerationErrorCode.ALREADY_SETTLED]: z.looseObject({
      verdict: text(),
      settledBy: text(),
      settledAt: text(),
    }),
    [OrderErrorCode.PAYMENT_DECLINED]: z.looseObject({ declineCode: text() }),
    [OrderErrorCode.PRICE_STALE]: z.looseObject({
      expectedAmountMinor: count(),
      currentAmountMinor: count(),
      currencyCode: text(),
    }),
    [OrderErrorCode.QUOTE_ADDRESS_MISMATCH]: z.looseObject({
      quotedCountryCode: text(),
      quotedPostalCode: text(),
    }),
    [OrderErrorCode.SALES_QUEUE_ADMISSION_REQUIRED]: z.looseObject({ dateId: text() }),
    [PairingErrorCode.EXECUTION_ENGAGED]: z.looseObject({ state: text(), engagedAt: text() }),
    [PairingErrorCode.INTENT_NOT_ENGAGEABLE]: z.looseObject({ intent: text() }),
    [PairingErrorCode.SLOW_DOWN]: z.looseObject({ retryAfterMs: count() }),
    [PayoutErrorCode.RECONCILIATION_DISCREPANCY_UNEXPLAINED]: z.looseObject({
      discrepancyMinor: count(),
      currencyCode: text(),
      payoutIds: list(),
    }),
    [DomainErrorCode.PUBLICATION_CHECKLIST_INCOMPLETE]: z.looseObject({ missing: list() }),
    [DomainErrorCode.STATE_CONFLICT]: z.looseObject({ currentVersion: count() }),
    [WatchDenialReason.CONCURRENT_LIMIT_REACHED]: z.looseObject({
      allowed: count(),
      activeSessions: z.array(z.looseObject({})),
    }),
  };

const NO_PARAMS: z.ZodType<Readonly<Record<string, unknown>>> = z.looseObject({});

export function errorParamsSchemaOf(code: ErrorCode): z.ZodType {
  return code in ERROR_PARAMS ? ERROR_PARAMS[code as keyof ErrorParamsMap] : NO_PARAMS;
}
