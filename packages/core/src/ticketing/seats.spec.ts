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

describe('the capacity hold', () => {
  it("takes the intent's expiry instant, not a duration of its own", () => {
    const intentExpiry = tvPairingIntentExpiry('2026-09-21T18:00:00.000Z');
    const hold = holdFor(2, intentExpiry);
    expect(hold.expiresAt).toBe(intentExpiry);
  });

  it('gives five minutes to a TV pairing and fifteen to a direct checkout', () => {
    // Five minutes because a pairing duration is a capacity commitment:
    // fifteen per hesitant viewer would empty a popular venue unsold.
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

describe('the capacity tiers', () => {
  it('refuses a shrink', () => {
    expect(() => assertTierWidens(500, 800)).not.toThrow();
    expect(() => assertTierWidens(500, 500)).toThrow();
    expect(() => assertTierWidens(500, 300)).toThrow();
  });
});

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
    expect(isScarce(gauge({ seatsSold: 90 }))).toBe(true);
    expect(isScarce(gauge({ seatsSold: 100 }))).toBe(false);
    expect(isScarce(gauge({ seatsSold: 84 }))).toBe(false);
  });
});
