/**
 * What each error code carries in `error.params`: one schema per code, read by the contract (which
 * documents it), the server (which builds it) and the client (which receives it typed). A code
 * absent here carries no parameter, or none the contract promises.
 */
import { z } from 'zod';
import { WatchDenialReason } from '../vocabulary/entitlement.js';
import { ApiErrorCode, CatalogErrorCode, ChannelErrorCode, ChatErrorCode, DomainErrorCode, IdentityErrorCode, ModerationErrorCode, OrderErrorCode, PairingErrorCode, PayoutErrorCode, type ErrorCode } from '../vocabulary/error-codes.js';
export interface ErrorParamsMap {
    [ApiErrorCode.CURSOR_TOO_OLD]: {
        maxAgeHours: number;
    };
    [ApiErrorCode.PERIOD_FILTER_REQUIRED]: {
        maxRangeDays: number;
    };
    [ApiErrorCode.RATE_LIMITED]: {
        retryAfterMs: number;
    };
    [ApiErrorCode.RIGHTS_VERSION_STALE]: {
        currentRightsVersion: number;
    };
    [ApiErrorCode.SCHEMA_INVALID]: {
        fields: string[];
    };
    [ApiErrorCode.SORT_KEY_FORBIDDEN]: {
        sortBy: string;
    };
    [ApiErrorCode.UPSTREAM_UNAVAILABLE]: {
        service: string;
    };
    [ChannelErrorCode.CREW_ROLE_RESERVED]: {
        crewRole: string;
        reservedTo: string[];
        reasonCode: string;
    };
    [ChannelErrorCode.CHANNEL_HAS_OPEN_OBLIGATIONS]: {
        datesOnSale: number;
        payoutsDue: number;
    };
    [ChannelErrorCode.ROLE_NOT_ASSIGNABLE]: {
        assignableRoles: string[];
        contactRoles: string[];
    };
    [ChannelErrorCode.TRANSFER_TARGET_INELIGIBLE]: {
        reasonCode: string;
    };
    [ChatErrorCode.RATE_LIMITED]: {
        retryAfterMs: number;
    };
    [CatalogErrorCode.DATE_HAS_SOLD_SEATS]: {
        seatsSold: number;
    };
    [CatalogErrorCode.OUTCOME_DECISION_FORBIDDEN]: {
        canEscalateTo: string[];
    };
    [CatalogErrorCode.PRICES_LOCKED]: {
        lockedAt: string;
    };
    [CatalogErrorCode.PROVISION_DEADLINE_PASSED]: {
        revisableUntil: string;
    };
    [CatalogErrorCode.REPLAY_POLICY_FINAL]: {
        currentPolicy: string;
    };
    [CatalogErrorCode.STREAM_KEY_ROTATION_DURING_RUN]: {
        runState: string;
    };
    [CatalogErrorCode.TECHNICAL_PROVISION_REQUIRED]: {
        threshold: number;
        capacityTotal: number;
        revisableUntil: string;
    };
    [IdentityErrorCode.TWO_FACTOR_REQUIRED]: {
        challengeId: string;
    };
    [ModerationErrorCode.ALREADY_CLAIMED]: {
        claimedBy: string;
        claimExpiresAt: string;
    };
    [ModerationErrorCode.ALREADY_SETTLED]: {
        verdict: string;
        settledBy: string;
        settledAt: string;
    };
    [OrderErrorCode.PAYMENT_DECLINED]: {
        declineCode: string;
    };
    [OrderErrorCode.PRICE_STALE]: {
        expectedAmountMinor: number;
        currentAmountMinor: number;
        currencyCode: string;
    };
    [OrderErrorCode.QUOTE_ADDRESS_MISMATCH]: {
        quotedCountryCode: string;
        quotedPostalCode: string;
    };
    [OrderErrorCode.SALES_QUEUE_ADMISSION_REQUIRED]: {
        dateId: string;
    };
    [PairingErrorCode.EXECUTION_ENGAGED]: {
        state: string;
        engagedAt: string;
    };
    [PairingErrorCode.INTENT_NOT_ENGAGEABLE]: {
        intent: string;
    };
    [PairingErrorCode.SLOW_DOWN]: {
        retryAfterMs: number;
    };
    [PayoutErrorCode.RECONCILIATION_DISCREPANCY_UNEXPLAINED]: {
        discrepancyMinor: number;
        currencyCode: string;
        payoutIds: string[];
    };
    [DomainErrorCode.PUBLICATION_CHECKLIST_INCOMPLETE]: {
        missing: string[];
    };
    [DomainErrorCode.STATE_CONFLICT]: {
        currentVersion: number;
    };
    [WatchDenialReason.CONCURRENT_LIMIT_REACHED]: {
        allowed: number;
        activeSessions: unknown[];
    };
}
export type ErrorParamsOf<C extends string> = C extends keyof ErrorParamsMap ? ErrorParamsMap[C] : Readonly<Record<string, unknown>>;
export declare const ERROR_PARAMS: {
    readonly [C in keyof ErrorParamsMap]: z.ZodType<ErrorParamsMap[C]>;
};
export declare function errorParamsSchemaOf(code: ErrorCode): z.ZodType;
//# sourceMappingURL=error-params.d.ts.map