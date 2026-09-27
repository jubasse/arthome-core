/** The viewer's commerce: capacity, holds, prices, seat code. */

export type { Gauge, SeatAvailability, SeatHold } from './seats.js';
export {
  AVAILABILITY_PUBLISH_MIN_INTERVAL_SECONDS,
  AVAILABILITY_VALID_SECONDS,
  HOLD_MINUTES_CHECKOUT,
  HOLD_MINUTES_TV_PAIRING,
  PROVISION_REVISION_HOURS,
  SALES_QUEUE_ADMISSION_SECONDS,
  SCARCITY_THRESHOLD_BPS,
  TECHNICAL_PROVISION_THRESHOLD,
  WAITLIST_NOTIFIED_ACCOUNTS_MAX,
  WAITLIST_PRIORITY_HOURS,
  assertTechnicalProvisionCovers,
  assertTierWidens,
  availabilityOf,
  availabilityValidUntil,
  checkoutIntentExpiry,
  fillRateBps,
  holdFor,
  isHoldExpired,
  isScarce,
  provisionRevisableUntil,
  requiresTechnicalProvision,
  seatsAvailable,
  tvPairingIntentExpiry,
} from './seats.js';

export type { OrderQuote, Promotion, ServiceFeeSchedule, TierPrice } from './pricing.js';
export {
  activePromotion,
  applyBestDiscount,
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
