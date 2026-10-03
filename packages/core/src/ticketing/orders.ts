import { OrderState } from '../vocabulary/commerce.js';

/**
 * adr-payments.md §7.3: a transition is applied only if it moves forward. `failed` ranks below
 * `paid`, because a payment confirmed after its hold expired still pays the order (D-082). The
 * ranks of `partially_refunded`, `refunded` and `disputed` are to confirm in T4, which designs
 * their transitions.
 */
const ORDER_STATE_RANK: Readonly<Record<OrderState, number>> = {
  [OrderState.PENDING]: 0,
  [OrderState.AWAITING_ACTION]: 1,
  [OrderState.PROCESSING]: 2,
  [OrderState.FAILED]: 3,
  [OrderState.PAID]: 4,
  [OrderState.PARTIALLY_REFUNDED]: 5,
  [OrderState.REFUNDED]: 6,
  [OrderState.DISPUTED]: 7,
};

export function orderStateMovesForward(from: OrderState, to: OrderState): boolean {
  return ORDER_STATE_RANK[to] > ORDER_STATE_RANK[from];
}

/** `Order.reference`, the one support reads out over the phone: `ATH-2026-00042`. */
export function orderReference(year: number, sequence: number): string {
  return `ATH-${String(year)}-${String(sequence).padStart(5, '0')}`;
}

export function isOrderReference(value: string): boolean {
  return /^ATH-\d{4}-\d{5,}$/.test(value);
}

/** Where the provider sends the buyer back after strong authentication; it concludes nothing. */
export function paymentReturnPath(orderId: string): string {
  return `/orders/${orderId}`;
}
