import { describe, expect, it } from 'vitest';

import {
  TECHNICAL_PROVISION_THRESHOLD,
  assertTechnicalProvisionCovers,
  assertTechnicalProvisionRecordable,
  assertTierWidens,
  availabilityOf,
  availabilityValidUntil,
  checkoutIntentExpiry,
  holdFor,
  isHoldExpired,
  isScarce,
  lateEntryOf,
  provisionRevisableUntil,
  salesEndedBy,
  seatCancelDeadline,
  seatSalesEndAt,
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
  priorityPoolSeats: 0,
  ...over,
});

function refusalOf(act: () => void): unknown {
  try {
    act();
  } catch (error) {
    if (isDomainError(error)) return { code: error.code, params: error.params };
    throw error;
  }
  return null;
}

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

describe('recording a technical provision', () => {
  const startsAt = '2026-09-21T19:00:00.000Z';
  const beforeDeadline = '2026-09-18T18:59:59.000Z';
  const atDeadline = '2026-09-18T19:00:00.000Z';

  it('accepts a provision covering the open capacity before the deadline, beyond it or not', () => {
    expect(
      refusalOf(() => assertTechnicalProvisionRecordable(8_000, 8_000, startsAt, beforeDeadline)),
    ).toBeNull();
    expect(
      refusalOf(() => assertTechnicalProvisionRecordable(8_000, 15_000, startsAt, beforeDeadline)),
    ).toBeNull();
  });

  it('refuses any provision from the deadline on, naming it', () => {
    expect(
      refusalOf(() => assertTechnicalProvisionRecordable(8_000, 15_000, startsAt, atDeadline)),
    ).toEqual({
      code: CatalogErrorCode.PROVISION_DEADLINE_PASSED,
      params: { revisableUntil: atDeadline },
    });
  });

  it('refuses a provision below the capacity already open, even under the threshold', () => {
    expect(
      refusalOf(() => assertTechnicalProvisionRecordable(500, 499, startsAt, beforeDeadline)),
    ).toEqual({
      code: CatalogErrorCode.PROVISION_BELOW_CAPACITY,
      params: { capacityTotal: 500, provisionedCapacity: 499 },
    });
  });

  it('sets no deadline while the date has no start', () => {
    expect(
      refusalOf(() => assertTechnicalProvisionRecordable(8_000, 15_000, null, atDeadline)),
    ).toBeNull();
  });
});

describe('the availability read', () => {
  it('holds a minute from the instant it is served', () => {
    expect(availabilityValidUntil('2026-09-21T18:40:00.000Z')).toBe('2026-09-21T18:41:00.000Z');
  });
});

describe('the cancel deadline', () => {
  it('is an hour before the start', () => {
    expect(seatCancelDeadline('2026-09-21T19:00:00.000Z')).toBe('2026-09-21T18:00:00.000Z');
  });
});

describe('seat sales end (D-089)', () => {
  const startsAt = '2026-09-21T19:00:00.000Z';

  it('closes thirty minutes after the start', () => {
    expect(seatSalesEndAt(startsAt)).toBe('2026-09-21T19:30:00.000Z');
  });

  it('is not ended before its instant, and is at it', () => {
    expect(salesEndedBy(seatSalesEndAt(startsAt), '2026-09-21T19:29:59.000Z')).toBe(false);
    expect(salesEndedBy(seatSalesEndAt(startsAt), '2026-09-21T19:30:00.000Z')).toBe(true);
  });

  it('never ends for a date with no end', () => {
    expect(salesEndedBy(null, '2026-09-21T19:30:00.000Z')).toBe(false);
  });

  it('is null before the start, and for a date with none', () => {
    expect(lateEntryOf(startsAt, '2026-09-21T18:59:59.000Z')).toBeNull();
    expect(lateEntryOf(null, '2026-09-21T19:00:00.000Z')).toBeNull();
  });

  it('names what a late buyer missed, and their cutoff', () => {
    expect(lateEntryOf(startsAt, '2026-09-21T19:11:30.000Z')).toEqual({
      startedAt: startsAt,
      minutesElapsed: 11,
      salesEndAt: '2026-09-21T19:30:00.000Z',
    });
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

  it('reads the public count, so an open priority pool leaves the date on its waiting list', () => {
    // 100 seats, 80 sold, 20 opened as a pool to 340 notified accounts: the public buys none.
    expect(
      availabilityOf(gauge({ seatsSold: 80, waitlistCount: 340, priorityPoolSeats: 20 })),
    ).toEqual({ kind: 'waitlist_only', waitlistCount: 340 });
    expect(availabilityOf(gauge({ seatsSold: 75, priorityPoolSeats: 20 }))).toEqual({
      kind: 'seats_available',
      seatsAvailable: 5,
    });
  });

  it('stops being "almost full" when nothing is left', () => {
    expect(isScarce(gauge({ seatsSold: 90 }))).toBe(true);
    expect(isScarce(gauge({ seatsSold: 100 }))).toBe(false);
    expect(isScarce(gauge({ seatsSold: 84 }))).toBe(false);
  });
});
