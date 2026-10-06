import { describe, expect, it } from 'vitest';

import {
  assertRefundWithinRemaining,
  assertSeatCancellable,
  refundCancelsSeat,
  refundDelayCodeOf,
  refundReasonOnDate,
  refundableRemaining,
  seatCancelReasonOf,
  seatSharesOf,
  seatStateMayMove,
} from './refunds.js';
import { isDomainError } from '../kernel/errors.js';
import { money, type Money } from '../money/money.js';
import { DateOutcome } from '../vocabulary/catalog.js';
import {
  REFUND_REASONS,
  RefundDelayCode,
  RefundMethod,
  RefundReason,
  SEAT_STATES,
  SeatCancelReason,
  SeatState,
} from '../vocabulary/commerce.js';
import { OrderErrorCode } from '../vocabulary/error-codes.js';

function refusalOf(act: () => void): unknown {
  try {
    act();
  } catch (error) {
    if (isDomainError(error)) return { code: error.code, params: error.params };
    throw error;
  }
  return null;
}

const eur = (amountMinor: number): Money => money(amountMinor, 'EUR');

describe('amounts', () => {
  it("the shares of an order's seats add up to its total, the remainder on the first seats in seat-id order", () => {
    expect(seatSharesOf(eur(1000), 3)).toEqual([eur(334), eur(333), eur(333)]);
    expect(seatSharesOf(eur(1001), 3)).toEqual([eur(334), eur(334), eur(333)]);
    expect(seatSharesOf(eur(4800), 2)).toEqual([eur(2400), eur(2400)]);
    const shares = seatSharesOf(eur(2399), 7);
    expect(shares.reduce((total, share) => total + share.amountMinor, 0)).toBe(2399);
  });

  it('refuses a quantity that is not a positive whole number', () => {
    expect(() => seatSharesOf(eur(1000), 0)).toThrow();
    expect(() => seatSharesOf(eur(1000), 1.5)).toThrow();
  });

  it('counts every decided refund against what was paid', () => {
    expect(refundableRemaining(eur(4800), eur(1200))).toEqual(eur(3600));
    expect(refundableRemaining(eur(4800), eur(4800))).toEqual(eur(0));
  });

  it('never reports a negative amount left, even past an over-refund', () => {
    expect(refundableRemaining(eur(4800), eur(5000))).toEqual(eur(0));
  });

  it('refuses a refund above what is left, with the amount left', () => {
    expect(() => {
      assertRefundWithinRemaining(eur(3600), eur(3600));
    }).not.toThrow();
    expect(
      refusalOf(() => {
        assertRefundWithinRemaining(eur(3601), eur(3600));
      }),
    ).toEqual({
      code: OrderErrorCode.REFUND_AMOUNT_EXCEEDS_REMAINING,
      params: { remainingMinor: 3600, currencyCode: 'EUR' },
    });
  });
});

describe('which refund cancels a seat', () => {
  it("only date_cancelled cancels a seat among the studio's reasons (D-095)", () => {
    expect(refundCancelsSeat(RefundReason.DATE_CANCELLED)).toBe(true);
    expect(refundCancelsSeat(RefundReason.GOODWILL)).toBe(false);
    expect(refundCancelsSeat(RefundReason.DUPLICATE)).toBe(false);
    expect(refundCancelsSeat(RefundReason.DISPUTE)).toBe(false);
  });

  it("maps the three that cancel to the seat's reason, and the others to none", () => {
    const cancelling = REFUND_REASONS.filter(refundCancelsSeat);
    expect(cancelling).toEqual([
      RefundReason.VIEWER_REQUEST,
      RefundReason.DATE_CANCELLED,
      RefundReason.ACCOUNT_DELETION,
    ]);
    expect(cancelling.map(seatCancelReasonOf)).toEqual([
      SeatCancelReason.VIEWER_REQUEST,
      SeatCancelReason.DATE_CANCELLED,
      SeatCancelReason.ACCOUNT_DELETION,
    ]);
    expect(seatCancelReasonOf(RefundReason.HOLD_EXPIRED_CAPACITY_LOST)).toBeNull();
  });

  it('a refund on a cancelled date carries date_cancelled (D-097)', () => {
    expect(refundReasonOnDate(DateOutcome.CANCELLED, RefundReason.HOLD_EXPIRED_CAPACITY_LOST)).toBe(
      RefundReason.DATE_CANCELLED,
    );
    expect(refundReasonOnDate(DateOutcome.CANCELLED, RefundReason.GOODWILL)).toBe(
      RefundReason.DATE_CANCELLED,
    );
    expect(refundReasonOnDate(DateOutcome.POSTPONED, RefundReason.GOODWILL)).toBe(
      RefundReason.GOODWILL,
    );
    expect(refundReasonOnDate(null, RefundReason.VIEWER_REQUEST)).toBe(RefundReason.VIEWER_REQUEST);
  });
});

describe("a seat's cancellation", () => {
  const deadline = '2026-11-04T18:30:00.000Z';

  it('a seat cancelled before its deadline, refused at it with the instant', () => {
    expect(() => {
      assertSeatCancellable(
        { state: SeatState.ACTIVE, cancelDeadline: deadline },
        '2026-11-04T18:29:59.999Z',
      );
    }).not.toThrow();
    expect(
      refusalOf(() => {
        assertSeatCancellable({ state: SeatState.ACTIVE, cancelDeadline: deadline }, deadline);
      }),
    ).toEqual({
      code: OrderErrorCode.SEAT_CANCEL_DEADLINE_PASSED,
      params: { cancelDeadline: deadline },
    });
  });

  it('cancels a seat with no deadline', () => {
    expect(() => {
      assertSeatCancellable({ state: SeatState.ACTIVE, cancelDeadline: null }, deadline);
    }).not.toThrow();
  });

  it('refuses a seat no longer active with its state, before looking at the deadline', () => {
    expect(
      refusalOf(() => {
        assertSeatCancellable(
          { state: SeatState.CANCELLED, cancelDeadline: deadline },
          '2026-11-04T19:00:00.000Z',
        );
      }),
    ).toEqual({ code: OrderErrorCode.SEAT_NOT_ACTIVE, params: { state: SeatState.CANCELLED } });
  });

  it('seat moves', () => {
    const allowed = SEAT_STATES.flatMap((from) =>
      SEAT_STATES.filter((to) => seatStateMayMove(from, to)).map((to) => `${from}>${to}`),
    );
    expect(allowed).toEqual([
      `${SeatState.ACTIVE}>${SeatState.CANCELLED}`,
      `${SeatState.ACTIVE}>${SeatState.TRANSFERRED}`,
      `${SeatState.ACTIVE}>${SeatState.CREDITED}`,
      `${SeatState.CANCELLED}>${SeatState.REFUNDED}`,
    ]);
  });

  it('delay code by method', () => {
    expect(refundDelayCodeOf(RefundMethod.ORIGINAL_PAYMENT_METHOD)).toBe(
      RefundDelayCode.BUSINESS_DAYS_3_5,
    );
    expect(refundDelayCodeOf(RefundMethod.ACCOUNT_CREDIT)).toBeNull();
  });
});
