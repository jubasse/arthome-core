/** The viewer's commerce: capacity, holds, prices, refunds, the waiting list, seat code. */

export type { Gauge, LateEntry, SeatAvailability, SeatHold } from './seats.js';
export {
  AVAILABILITY_PUBLISH_MIN_INTERVAL_SECONDS,
  AVAILABILITY_VALID_SECONDS,
  HOLD_EXPIRY_BATCH,
  HOLD_MINUTES_CHECKOUT,
  HOLD_MINUTES_TV_PAIRING,
  PROVISION_REVISION_HOURS,
  SALES_QUEUE_ADMISSION_SECONDS,
  SCARCITY_THRESHOLD_BPS,
  SEAT_SALES_CUTOFF_MINUTES_AFTER_START,
  TECHNICAL_PROVISION_THRESHOLD,
  WAITLIST_NOTIFIED_ACCOUNTS_MAX,
  WAITLIST_PRIORITY_HOURS,
  assertTechnicalProvisionCovers,
  assertTechnicalProvisionRecordable,
  assertTierWidens,
  availabilityOf,
  availabilityValidUntil,
  checkoutIntentExpiry,
  fillRateBps,
  holdFor,
  isHoldExpired,
  isScarce,
  lateEntryOf,
  provisionRevisableUntil,
  requiresTechnicalProvision,
  salesEndedBy,
  seatCancelDeadline,
  seatSalesEndAt,
  seatsAvailable,
  seatsAvailableTo,
  tvPairingIntentExpiry,
} from './seats.js';

export {
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

export {
  assertWaitlistJoinable,
  isPriorityWindowOpen,
  outcomeEndsWaitlist,
  priorityUntilOf,
  waitlistEntryMayMove,
  waitlistStateOnJoin,
} from './waitlist.js';

export {
  isOrderReference,
  orderReference,
  orderStateMovesForward,
  paymentReturnPath,
} from './orders.js';

export type { OrderQuote, Promotion, ServiceFeeSchedule, TierPrice } from './pricing.js';
export {
  activePromotion,
  applyBestDiscount,
  assertPricesShareCurrency,
  lateRatePrice,
  lowestActivePrice,
  priceOfTier,
  quoteSeats,
  serviceFeeFor,
} from './pricing.js';

export {
  SEAT_CODE_ALPHABET,
  SEAT_CODE_BODY_LENGTH,
  isSeatCode,
  normalizeSeatCodeInput,
  seatCode,
} from './seat-code.js';
