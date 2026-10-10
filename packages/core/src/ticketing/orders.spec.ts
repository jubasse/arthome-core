import { describe, expect, it } from 'vitest';

import {
  isOrderReference,
  orderReference,
  orderStateMovesForward,
  paymentReturnPath,
} from './orders.js';
import { ORDER_STATES, OrderState } from '../vocabulary/commerce.js';

describe('order-state transitions', () => {
  it('lets a payment confirmed late still pay the order (D-082)', () => {
    expect(orderStateMovesForward(OrderState.FAILED, OrderState.PAID)).toBe(true);
  });

  it('refuses a transition that does not advance', () => {
    expect(orderStateMovesForward(OrderState.PAID, OrderState.FAILED)).toBe(false);
    expect(orderStateMovesForward(OrderState.PENDING, OrderState.PENDING)).toBe(false);
  });

  it('orders the awaiting states ahead of a settled one', () => {
    expect(orderStateMovesForward(OrderState.PENDING, OrderState.AWAITING_ACTION)).toBe(true);
    expect(orderStateMovesForward(OrderState.AWAITING_ACTION, OrderState.PROCESSING)).toBe(true);
  });

  it('moves forward through refunds and a dispute', () => {
    expect(orderStateMovesForward(OrderState.PAID, OrderState.PARTIALLY_REFUNDED)).toBe(true);
    expect(orderStateMovesForward(OrderState.PARTIALLY_REFUNDED, OrderState.REFUNDED)).toBe(true);
    expect(orderStateMovesForward(OrderState.PAID, OrderState.REFUNDED)).toBe(true);
    for (const from of [OrderState.PAID, OrderState.PARTIALLY_REFUNDED, OrderState.REFUNDED]) {
      expect(orderStateMovesForward(from, OrderState.DISPUTED)).toBe(true);
    }
  });

  it('never goes back from a full refund, nor anywhere from a dispute', () => {
    expect(orderStateMovesForward(OrderState.REFUNDED, OrderState.PARTIALLY_REFUNDED)).toBe(false);
    for (const to of ORDER_STATES) {
      expect(orderStateMovesForward(OrderState.DISPUTED, to)).toBe(false);
    }
  });
});

describe('the order reference', () => {
  it('pads the sequence to five digits', () => {
    expect(orderReference(2026, 42)).toBe('ATH-2026-00042');
  });

  it('is not shortened by a sequence already five digits or more', () => {
    expect(orderReference(2026, 123456)).toBe('ATH-2026-123456');
  });

  it('recognises its own shape', () => {
    expect(isOrderReference('ATH-2026-00042')).toBe(true);
    expect(isOrderReference('ath-2026-00042')).toBe(false);
    expect(isOrderReference('ATH-2026-42')).toBe(false);
  });
});

describe('the payment return path', () => {
  it('names the order, and concludes nothing', () => {
    expect(paymentReturnPath('019928f5-0000-7000-8000-0000000000aa')).toBe(
      '/orders/019928f5-0000-7000-8000-0000000000aa',
    );
  });
});
