import { describe, expect, it } from 'vitest';

import {
  PAYMENT_EVENT_KINDS,
  PaymentEventKind,
  PaymentProviderUnavailable,
  intentCancelIdempotencyKey,
  refundIdempotencyKey,
} from './ports.js';

describe('PaymentProviderUnavailable', () => {
  it('names itself, so a caller can tell it apart from a decline', () => {
    const error = new PaymentProviderUnavailable('the adapter timed out');
    expect(error.name).toBe('PaymentProviderUnavailable');
    expect(error).toBeInstanceOf(Error);
  });
});

describe("the provider's idempotency keys", () => {
  it('keys a refund by its own row, so two partial refunds of one order never share a key', () => {
    expect(refundIdempotencyKey('019928f5-0000-7000-8000-0000000000a1')).toBe(
      'refund:019928f5-0000-7000-8000-0000000000a1',
    );
    expect(refundIdempotencyKey('019928f5-0000-7000-8000-0000000000a2')).not.toBe(
      refundIdempotencyKey('019928f5-0000-7000-8000-0000000000a1'),
    );
  });

  it("keys an intent's cancellation by its order", () => {
    expect(intentCancelIdempotencyKey('019928f5-0000-7000-8000-0000000000aa')).toBe(
      'cancel:019928f5-0000-7000-8000-0000000000aa',
    );
  });
});

describe('the webhook kinds', () => {
  it('maps a settled refund and an opened dispute', () => {
    expect(PAYMENT_EVENT_KINDS).toContain(PaymentEventKind.REFUND_SUCCEEDED);
    expect(PAYMENT_EVENT_KINDS).toContain(PaymentEventKind.DISPUTE_OPENED);
  });
});
