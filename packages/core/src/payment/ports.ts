/**
 * The payment ports, settling ONE set of method names: adr-ticketing.md §2 uses `createIntent`,
 * `cancelIntent`, `refund`; adr-payments.md §4 sketches `authorize`, `capture`, `refund`, `quote`.
 * This is the interim, using the first. No provider identifier crosses (adr-payments.md §4): a
 * next action's `kind` is the provider's string, opaque here, relayed to the surface as the
 * contract's `nextAction.kind`.
 */

import type { Instant } from '../kernel/clock.js';
import type { Money } from '../money/money.js';

/** adr-payments.md §7.1: a webhook signed further in the past than this is rejected. */
export const PAYMENT_WEBHOOK_TOLERANCE_SECONDS = 300;

export const INTENT_STATUSES = ['succeeded', 'requires_action', 'processing', 'declined'] as const;
export type IntentStatus = (typeof INTENT_STATUSES)[number];
export const IntentStatus = {
  SUCCEEDED: 'succeeded',
  REQUIRES_ACTION: 'requires_action',
  PROCESSING: 'processing',
  DECLINED: 'declined',
} as const;

/** What a provider's webhook says happened to an intent, recorded before anything reads it. */
export const PAYMENT_EVENT_KINDS = [
  'intent_succeeded',
  'intent_requires_action',
  'intent_processing',
  'intent_failed',
  'intent_cancelled',
  'unhandled',
] as const;
export type PaymentEventKind = (typeof PAYMENT_EVENT_KINDS)[number];
export const PaymentEventKind = {
  INTENT_SUCCEEDED: 'intent_succeeded',
  INTENT_REQUIRES_ACTION: 'intent_requires_action',
  INTENT_PROCESSING: 'intent_processing',
  INTENT_FAILED: 'intent_failed',
  INTENT_CANCELLED: 'intent_cancelled',
  UNHANDLED: 'unhandled',
} as const;

export interface PaymentIntentRequest {
  readonly orderId: string; // the provider's idempotency key
  readonly amount: Money;
  readonly expiresAt: Instant; // the hold's (adr-payments.md §8 rule 2)
  readonly returnUrl: string;
}
export interface PaymentIntent {
  readonly ref: string; // opaque
  readonly status: IntentStatus;
  readonly clientSecret: string;
  /** `kind` is the provider's, opaque: the surface's payment element reads it, the domain never does. */
  readonly nextAction: { readonly kind: string; readonly redirectUrl: string | null } | null;
  readonly declineCode: string | null;
}
export interface RefundRequest {
  readonly intentRef: string;
  readonly amount: Money;
  readonly idempotencyKey: string; // `refund:{orderId}` (adr-ticketing.md §8)
}
export interface PaymentEvent {
  readonly eventId: string;
  readonly kind: PaymentEventKind;
  readonly intentRef: string | null;
  readonly orderId: string | null;
  readonly occurredAt: Instant;
  readonly declineCode: string | null;
}

/**
 * The provider could not be reached or did not answer: nothing is known of what it did, so the
 * caller retries under the same idempotency key, never a new one.
 */
export class PaymentProviderUnavailable extends Error {
  public override readonly name = 'PaymentProviderUnavailable';
}

export interface PaymentPort {
  /** Throws `PaymentProviderUnavailable` when the provider cannot say what it did. */
  createIntent(request: PaymentIntentRequest): Promise<PaymentIntent>;
  cancelIntent(intentRef: string, idempotencyKey: string): Promise<void>; // succeeded stays succeeded
  refund(request: RefundRequest): Promise<{ readonly refundRef: string }>;
}
export interface PaymentWebhookPort {
  readonly signatureHeader: string;
  verifySignature(rawBody: Uint8Array, signature: string | undefined, now: Instant): boolean;
  parse(rawBody: Uint8Array): PaymentEvent | null;
}
