/**
 * The payment ports (adr-payments.md §4): `createIntent`, `cancelIntent`, `refund`, settling
 * adr-ticketing.md §2's names over an earlier sketch (`authorize`, `capture`, `quote`), neither of
 * which the domain calls yet. No provider identifier crosses: a next action's `kind` is the
 * provider's string, opaque here, relayed to the surface as the contract's `nextAction.kind`.
 */
import type { Instant } from '../kernel/clock.js';
import type { Money } from '../money/money.js';
/** adr-payments.md §7.1: a webhook signed further in the past than this is rejected. */
export declare const PAYMENT_WEBHOOK_TOLERANCE_SECONDS = 300;
export declare const INTENT_STATUSES: readonly ["succeeded", "requires_action", "processing", "declined"];
export type IntentStatus = (typeof INTENT_STATUSES)[number];
export declare const IntentStatus: {
    readonly SUCCEEDED: "succeeded";
    readonly REQUIRES_ACTION: "requires_action";
    readonly PROCESSING: "processing";
    readonly DECLINED: "declined";
};
/**
 * What a provider's webhook says happened to a payment, recorded before anything reads it. A failed
 * refund is not mapped by adr-payments.md §8, so it stays `unhandled`.
 */
export declare const PAYMENT_EVENT_KINDS: readonly ["intent_succeeded", "intent_requires_action", "intent_processing", "intent_failed", "intent_cancelled", "refund_succeeded", "dispute_opened", "unhandled"];
export type PaymentEventKind = (typeof PAYMENT_EVENT_KINDS)[number];
export declare const PaymentEventKind: {
    readonly INTENT_SUCCEEDED: "intent_succeeded";
    readonly INTENT_REQUIRES_ACTION: "intent_requires_action";
    readonly INTENT_PROCESSING: "intent_processing";
    readonly INTENT_FAILED: "intent_failed";
    readonly INTENT_CANCELLED: "intent_cancelled";
    readonly REFUND_SUCCEEDED: "refund_succeeded";
    readonly DISPUTE_OPENED: "dispute_opened";
    readonly UNHANDLED: "unhandled";
};
export interface PaymentIntentRequest {
    readonly orderId: string;
    readonly amount: Money;
    readonly expiresAt: Instant;
    readonly returnUrl: string;
}
export interface PaymentIntent {
    readonly ref: string;
    readonly status: IntentStatus;
    readonly clientSecret: string;
    /** `kind` is the provider's, opaque: the surface's payment element reads it, the domain never does. */
    readonly nextAction: {
        readonly kind: string;
        readonly redirectUrl: string | null;
    } | null;
    readonly declineCode: string | null;
}
export interface RefundRequest {
    readonly intentRef: string;
    readonly amount: Money;
    readonly idempotencyKey: string;
    /** adr-payments.md §9: the commission goes back with the money. */
    readonly refundApplicationFee: boolean;
}
export interface PaymentEvent {
    readonly eventId: string;
    readonly kind: PaymentEventKind;
    readonly intentRef: string | null;
    readonly orderId: string | null;
    readonly occurredAt: Instant;
    readonly declineCode: string | null;
    /** Null on an intent event. */
    readonly refundRef: string | null;
    /** Everything refunded on the payment so far, not this refund alone; null on an intent event. */
    readonly amountRefunded: Money | null;
}
/**
 * The provider's idempotency key for one refund row, so two partial refunds of one order never share
 * one. Stored as text on the row that owes the call: a row already owed under `refund:{orderId}`
 * keeps its key. Not a BullMQ job id, which refuses `:`.
 */
export declare function refundIdempotencyKey(refundId: string): string;
/** The provider's idempotency key for cancelling an order's intent; not a BullMQ job id either. */
export declare function intentCancelIdempotencyKey(orderId: string): string;
/**
 * The provider could not be reached or did not answer: nothing is known of what it did, so the
 * caller retries under the same idempotency key, never a new one.
 */
export declare class PaymentProviderUnavailable extends Error {
    readonly name = "PaymentProviderUnavailable";
}
export interface PaymentPort {
    /** Throws `PaymentProviderUnavailable` when the provider cannot say what it did. */
    createIntent(request: PaymentIntentRequest): Promise<PaymentIntent>;
    cancelIntent(intentRef: string, idempotencyKey: string): Promise<void>;
    refund(request: RefundRequest): Promise<{
        readonly refundRef: string;
    }>;
}
export interface PaymentWebhookPort {
    readonly signatureHeader: string;
    verifySignature(rawBody: Uint8Array, signature: string | undefined, now: Instant): boolean;
    parse(rawBody: Uint8Array): PaymentEvent | null;
}
//# sourceMappingURL=ports.d.ts.map