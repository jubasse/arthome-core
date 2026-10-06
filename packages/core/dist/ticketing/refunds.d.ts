/** A seat's cancellation and an order's refunds: which refund cancels a seat, and how much is left. */
import type { Instant } from '../kernel/clock.js';
import { type Money } from '../money/money.js';
import { DateOutcome } from '../vocabulary/catalog.js';
import { RefundDelayCode, RefundMethod, RefundReason, SeatCancelReason, SeatState } from '../vocabulary/commerce.js';
/**
 * A seat is `cancelled` when its cancellation is decided, and `refunded` once the provider confirms
 * the money went back (`refund_succeeded`), so its card tells the truth in between.
 */
export declare function seatStateMayMove(from: SeatState, to: SeatState): boolean;
/** D-095: a `goodwill`, `duplicate` or `dispute` refund gives money back and leaves the seat active. */
export declare function refundCancelsSeat(reason: RefundReason): boolean;
/** Null for a refund that cancels no seat. */
export declare function seatCancelReasonOf(reason: RefundReason): SeatCancelReason | null;
/** D-097: a refund decided while its date is cancelled carries `date_cancelled`, a late payment's included. */
export declare function refundReasonOnDate(outcome: DateOutcome | null, reason: RefundReason): RefundReason;
/**
 * An amount split over an order's seats, in seat-id order: each gets the floor of `total / quantity`
 * and the first `total mod quantity` one minor unit more, so the shares add up to the frozen total
 * whatever the quote. The same split serves an order's refund and its credit.
 */
export declare function seatSharesOf(total: Money, quantity: number): readonly Money[];
/** `refunded` counts every refund decided on the order, settled or not. */
export declare function refundableRemaining(paid: Money, refunded: Money): Money;
export declare function assertRefundWithinRemaining(requested: Money, remaining: Money): void;
/** A seat with no deadline is cancellable; one at or past its deadline is not. */
export declare function assertSeatCancellable(seat: {
    readonly state: SeatState;
    readonly cancelDeadline: Instant | null;
}, now: Instant): void;
/** Null for a credit, which is on the account at once. */
export declare function refundDelayCodeOf(method: RefundMethod): RefundDelayCode | null;
//# sourceMappingURL=refunds.d.ts.map