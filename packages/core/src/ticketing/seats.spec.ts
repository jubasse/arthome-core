import { describe, expect, it } from 'vitest';

import {
  assertTierWidens,
  availabilityOf,
  checkoutIntentExpiry,
  holdFor,
  isHoldExpired,
  isScarce,
  seatsAvailable,
  tvPairingIntentExpiry,
  type Gauge,
} from './seats.js';

const gauge = (over: Partial<Gauge> = {}): Gauge => ({
  capacityTotal: 100,
  seatsSold: 0,
  seatsHeld: 0,
  waitlistCount: 0,
  ...over,
});

/**
 * PROTECTED INVARIANT
 *   `SeatHold.expiresAt` is the SAME INSTANT as the expiry of the purchase
 *   intent that created it. One instant, carried by two objects, never two
 *   durations that drift apart.
 *
 * WHY THIS TEST EXISTS
 *   Raised by `auth`: the duration of a `seat` pairing must be the duration of
 *   a hold, otherwise the capacity shown on the TV is wrong for the whole time
 *   the phone is awaited. The TV shows "12 seats", the viewer goes to fetch
 *   their phone, and for five minutes nothing guarantees those seats still
 *   exist.
 */
describe('the capacity hold', () => {
  it("takes the intent's expiry instant, not a duration of its own", () => {
    // The signature ENFORCES the invariant: you do not pass a duration, you pass
    // the intent's expiry instant. There is nothing to keep in sync.
    const intentExpiry = tvPairingIntentExpiry('2026-09-21T18:00:00.000Z');
    const hold = holdFor(2, intentExpiry);
    expect(hold.expiresAt).toBe(intentExpiry);
  });

  it('gives five minutes to a TV pairing and fifteen to a direct checkout', () => {
    // The choice of five minutes is JUSTIFIED here: a pairing duration is a
    // capacity commitment, and fifteen minutes per hesitant viewer would empty
    // a popular venue without a single seat being sold.
    expect(tvPairingIntentExpiry('2026-09-21T18:00:00.000Z')).toBe('2026-09-21T18:05:00.000Z');
    expect(checkoutIntentExpiry('2026-09-21T18:00:00.000Z')).toBe('2026-09-21T18:15:00.000Z');
  });

  it('subtracts held seats from the availability served', () => {
    // Without that subtraction, two viewers buy the last seat.
    expect(seatsAvailable(gauge({ seatsSold: 98, seatsHeld: 2 }))).toBe(0);
    expect(seatsAvailable(gauge({ seatsSold: 98, seatsHeld: 1 }))).toBe(1);
  });

  it('frees the capacity the second the intent expires', () => {
    const hold = holdFor(1, '2026-09-21T18:05:00.000Z');
    expect(isHoldExpired(hold, '2026-09-21T18:04:59.000Z')).toBe(false);
    expect(isHoldExpired(hold, '2026-09-21T18:05:00.000Z')).toBe(true);
  });

  it('refuses an absurd quantity rather than holding it', () => {
    expect(() => holdFor(0, '2026-09-21T18:05:00.000Z')).toThrow();
    expect(() => holdFor(-1, '2026-09-21T18:05:00.000Z')).toThrow();
  });
});

/**
 * PROTECTED INVARIANT
 *   A tier WIDENS the capacity, never shrinks it after going on sale.
 *
 * WHY
 *   Shrinking after going on sale would cancel seats already sold.
 */
describe('the capacity tiers', () => {
  it('refuses a shrink', () => {
    expect(() => assertTierWidens(500, 800)).not.toThrow();
    expect(() => assertTierWidens(500, 500)).toThrow();
    expect(() => assertTierWidens(500, 300)).toThrow();
  });
});

/**
 * PROTECTED INVARIANT
 *   The capacity state is a STATE, never a sentence.
 *
 * WHY
 *   `helpers.seatsLabel` returned "86 seats" or "Sold out". A sentence cannot
 *   be filtered, cannot be sorted, cannot be translated — and leaks i18n.
 */
describe('availability', () => {
  it('tells apart available, waiting list only, and sold out', () => {
    expect(availabilityOf(gauge({ seatsSold: 14 }))).toEqual({
      kind: 'seats_available',
      seatsAvailable: 86,
    });
    expect(availabilityOf(gauge({ seatsSold: 100, waitlistCount: 340 }))).toEqual({
      kind: 'waitlist_only',
      waitlistCount: 340,
    });
    expect(availabilityOf(gauge({ seatsSold: 100 }))).toEqual({ kind: 'sold_out' });
  });

  it('stops being "almost full" when nothing is left', () => {
    // "Almost full" on a sold-out date would be a polite lie.
    expect(isScarce(gauge({ seatsSold: 90 }))).toBe(true);
    expect(isScarce(gauge({ seatsSold: 100 }))).toBe(false);
    expect(isScarce(gauge({ seatsSold: 84 }))).toBe(false);
  });
});
