/** A seat's cancellation and an order's refunds: which refund cancels a seat, and how much is left. */

import type { Instant } from '../kernel/clock.js';
import { DomainError } from '../kernel/errors.js';
import { compare, money, subtract, type Money } from '../money/money.js';
import { isBefore } from '../time/instant.js';
import { DateOutcome } from '../vocabulary/catalog.js';
import {
  RefundDelayCode,
  RefundMethod,
  RefundReason,
  SeatCancelReason,
  SeatState,
} from '../vocabulary/commerce.js';
import { DomainGuardCode, OrderErrorCode } from '../vocabulary/error-codes.js';

const SEAT_MOVES: Readonly<Record<SeatState, readonly SeatState[]>> = {
  [SeatState.ACTIVE]: [SeatState.CANCELLED, SeatState.CREDITED, SeatState.TRANSFERRED],
  [SeatState.CANCELLED]: [SeatState.REFUNDED],
  [SeatState.REFUNDED]: [],
  [SeatState.TRANSFERRED]: [],
  [SeatState.CREDITED]: [],
};

/**
 * A seat is `cancelled` when its cancellation is decided, and `refunded` once the provider confirms
 * the money went back (`refund_succeeded`), so its card tells the truth in between.
 */
export function seatStateMayMove(from: SeatState, to: SeatState): boolean {
  return SEAT_MOVES[from].includes(to);
}

const SEAT_CANCEL_REASON_OF_REFUND: Readonly<Record<RefundReason, SeatCancelReason | null>> = {
  [RefundReason.VIEWER_REQUEST]: SeatCancelReason.VIEWER_REQUEST,
  [RefundReason.DATE_CANCELLED]: SeatCancelReason.DATE_CANCELLED,
  [RefundReason.ACCOUNT_DELETION]: SeatCancelReason.ACCOUNT_DELETION,
  [RefundReason.GOODWILL]: null,
  [RefundReason.DUPLICATE]: null,
  [RefundReason.DISPUTE]: null,
  [RefundReason.HOLD_EXPIRED_CAPACITY_LOST]: null,
};

/** D-095: a `goodwill`, `duplicate` or `dispute` refund gives money back and leaves the seat active. */
export function refundCancelsSeat(reason: RefundReason): boolean {
  return seatCancelReasonOf(reason) !== null;
}

/** Null for a refund that cancels no seat. */
export function seatCancelReasonOf(reason: RefundReason): SeatCancelReason | null {
  return SEAT_CANCEL_REASON_OF_REFUND[reason];
}

/** D-097: a refund decided while its date is cancelled carries `date_cancelled`, a late payment's included. */
export function refundReasonOnDate(
  outcome: DateOutcome | null,
  reason: RefundReason,
): RefundReason {
  return outcome === DateOutcome.CANCELLED ? RefundReason.DATE_CANCELLED : reason;
}

/**
 * An amount split over an order's seats, in seat-id order: each gets the floor of `total / quantity`
 * and the first `total mod quantity` one minor unit more, so the shares add up to the frozen total
 * whatever the quote. The same split serves an order's refund and its credit.
 */
export function seatSharesOf(total: Money, quantity: number): readonly Money[] {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new DomainError({
      code: DomainGuardCode.MONEY_COUNT_INVALID,
      params: { count: String(quantity) },
    });
  }
  const share = Math.floor(total.amountMinor / quantity);
  const remainder = total.amountMinor - share * quantity;
  return Array.from({ length: quantity }, (_, index) =>
    money(index < remainder ? share + 1 : share, total.currencyCode),
  );
}

/** `refunded` counts every refund decided on the order, settled or not. */
export function refundableRemaining(paid: Money, refunded: Money): Money {
  const remaining = subtract(paid, refunded);
  return remaining.amountMinor < 0 ? money(0, paid.currencyCode) : remaining;
}

export function assertRefundWithinRemaining(requested: Money, remaining: Money): void {
  if (compare(requested, remaining) > 0) {
    throw new DomainError({
      code: OrderErrorCode.REFUND_AMOUNT_EXCEEDS_REMAINING,
      params: { remainingMinor: remaining.amountMinor, currencyCode: remaining.currencyCode },
    });
  }
}

/** A seat with no deadline is cancellable; one at or past its deadline is not. */
export function assertSeatCancellable(
  seat: { readonly state: SeatState; readonly cancelDeadline: Instant | null },
  now: Instant,
): void {
  if (seat.state !== SeatState.ACTIVE) {
    throw new DomainError({ code: OrderErrorCode.SEAT_NOT_ACTIVE, params: { state: seat.state } });
  }
  if (seat.cancelDeadline !== null && !isBefore(now, seat.cancelDeadline)) {
    throw new DomainError({
      code: OrderErrorCode.SEAT_CANCEL_DEADLINE_PASSED,
      params: { cancelDeadline: seat.cancelDeadline },
    });
  }
}

const REFUND_DELAY_CODE_OF_METHOD: Readonly<Record<RefundMethod, RefundDelayCode | null>> = {
  [RefundMethod.ORIGINAL_PAYMENT_METHOD]: RefundDelayCode.BUSINESS_DAYS_3_5,
  [RefundMethod.ACCOUNT_CREDIT]: null,
};

/** Null for a credit, which is on the account at once. */
export function refundDelayCodeOf(method: RefundMethod): RefundDelayCode | null {
  return REFUND_DELAY_CODE_OF_METHOD[method];
}
