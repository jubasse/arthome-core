import { describe, expect, it } from 'vitest';

import {
  TECHNICAL_PROVISION_THRESHOLD,
  assertTechnicalProvisionCovers,
  assertTierWidens,
  availabilityOf,
  availabilityValidUntil,
  checkoutIntentExpiry,
  holdFor,
  isHoldExpired,
  isScarce,
  provisionRevisableUntil,
  seatsAvailable,
  tvPairingIntentExpiry,
  type Gauge,
} from './seats.js';
import { isDomainError } from '../kernel/errors.js';
import { CatalogErrorCode } from '../vocabulary/error-codes.js';

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

describe('the technical provision', () => {
  const beyond = TECHNICAL_PROVISION_THRESHOLD + 1;
  const startsAt = '2026-09-21T19:00:00.000Z';

  function refusalOf(act: () => void): unknown {
    try {
      act();
    } catch (error) {
      if (isDomainError(error)) return { code: error.code, params: error.params };
      throw error;
    }
    return null;
  }

  it('stops being revisable three days before the date starts', () => {
    expect(provisionRevisableUntil(startsAt)).toBe('2026-09-18T19:00:00.000Z');
  });

  it('asks for nothing up to the threshold, provision or not', () => {
    expect(
      refusalOf(() =>
        assertTechnicalProvisionCovers(TECHNICAL_PROVISION_THRESHOLD, null, startsAt),
      ),
    ).toBeNull();
  });

  it('refuses a capacity beyond the threshold while no provision is recorded, naming the deadline', () => {
    expect(refusalOf(() => assertTechnicalProvisionCovers(beyond, null, startsAt))).toEqual({
      code: CatalogErrorCode.TECHNICAL_PROVISION_REQUIRED,
      params: {
        threshold: TECHNICAL_PROVISION_THRESHOLD,
        capacityTotal: beyond,
        revisableUntil: '2026-09-18T19:00:00.000Z',
      },
    });
  });

  it('refuses a provision smaller than the capacity, and names it', () => {
    expect(refusalOf(() => assertTechnicalProvisionCovers(beyond, beyond - 1, startsAt))).toEqual({
      code: CatalogErrorCode.TECHNICAL_PROVISION_REQUIRED,
      params: {
        threshold: TECHNICAL_PROVISION_THRESHOLD,
        capacityTotal: beyond,
        provisionedCapacity: beyond - 1,
        revisableUntil: '2026-09-18T19:00:00.000Z',
      },
    });
  });

  it('accepts a provision covering the capacity', () => {
    expect(refusalOf(() => assertTechnicalProvisionCovers(beyond, beyond, startsAt))).toBeNull();
  });

  it('names no deadline while the date has no start', () => {
    expect(refusalOf(() => assertTechnicalProvisionCovers(beyond, null, null))).toEqual({
      code: CatalogErrorCode.TECHNICAL_PROVISION_REQUIRED,
      params: { threshold: TECHNICAL_PROVISION_THRESHOLD, capacityTotal: beyond },
    });
  });
});

describe('the availability read', () => {
  it('holds a minute from the instant it is served', () => {
    expect(availabilityValidUntil('2026-09-21T18:40:00.000Z')).toBe('2026-09-21T18:41:00.000Z');
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
