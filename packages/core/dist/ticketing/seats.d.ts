/**
 * Capacity, tiers, and the HOLD that stops capacity lying.
 */
import type { Instant } from '../kernel/clock.js';
/**
 * The capacity state, as a DISCRIMINATED UNION.
 *
 * `helpers.seatsLabel` returned a SENTENCE — "86 seats", "Sold out",
 * "Waiting list · 340". A sentence cannot be filtered, cannot be sorted, cannot
 * be translated, and leaks i18n. The domain returns a STATE; the label is a key
 * resolved by the surface.
 */
export type SeatAvailability = {
    readonly kind: 'seats_available';
    readonly seatsAvailable: number;
} | {
    readonly kind: 'waitlist_only';
    readonly waitlistCount: number;
} | {
    readonly kind: 'sold_out';
};
export interface Gauge {
    readonly capacityTotal: number;
    readonly seatsSold: number;
    /** Seats held by a purchase intent in progress. See `SeatHold`. */
    readonly seatsHeld: number;
    readonly waitlistCount: number;
}
/**
 * The seats ACTUALLY available: net of holds in progress.
 *
 * Without subtracting `seatsHeld`, two viewers buy the last seat.
 */
export declare function seatsAvailable(gauge: Gauge): number;
export declare function availabilityOf(gauge: Gauge): SeatAvailability;
/**
 * The fill RATE, in basis points — and not the capacity.
 *
 * `storefront-web` (shape 4): "the surface needs the rate; serving the capacity
 * and letting it be computed is recreating the composed value in two places".
 * The mockup proves it by applying a constant of 2,000 seats independent of the
 * venue — fill rate and seats remaining became two independent values there.
 */
export declare function fillRateBps(gauge: Gauge): number;
/**
 * "Almost full" — and the THRESHOLD is a domain rule, not an interface literal.
 *
 * 8,500 basis points = 85%, which is also the threshold of the "almost full"
 * notification. The two MUST be the same number: a card saying "almost full"
 * and an alert that never fires would be incomprehensible.
 */
export declare const SCARCITY_THRESHOLD_BPS = 8500;
export declare function isScarce(gauge: Gauge): boolean;
/**
 * THE CAPACITY HOLD, and its SINGLE-INSTANT invariant.
 *
 * Raised by `auth` at temps 4, and it commits `ticketing`: the duration of a
 * `seat` pairing MUST be the duration of a seat `hold`, otherwise the capacity
 * shown on the TV is wrong for the whole time the phone is awaited. The case is
 * concrete: the TV shows "12 seats", the viewer goes to fetch their phone, and
 * for five minutes nothing guarantees those seats still exist.
 *
 *   ⚠ `SeatHold.expiresAt` is the SAME INSTANT as the expiry of the purchase
 *     intent that created it. One instant, carried by two objects, NEVER two
 *     durations that drift apart.
 *
 * And the hold is placed AT THE OPENING of the intent, not at its approval: it
 * is at the moment the TV shows the code that the capacity must become true.
 */
export declare const HOLD_MINUTES_CHECKOUT = 15;
export declare const HOLD_MINUTES_TV_PAIRING = 5;
export interface SeatHold {
    readonly quantity: number;
    readonly expiresAt: Instant;
}
/**
 * Places a hold whose expiry IS the intent's.
 *
 * The signature enforces the invariant: you do not pass a duration, you pass
 * the intent's expiry instant. So there is nothing to keep in sync.
 */
export declare function holdFor(quantity: number, intentExpiresAt: Instant): SeatHold;
/** The intent duration for a direct checkout journey. */
export declare function checkoutIntentExpiry(openedAt: Instant): Instant;
/** The intent duration for a TV pairing — five minutes, not fifteen. */
export declare function tvPairingIntentExpiry(openedAt: Instant): Instant;
export declare function isHoldExpired(hold: SeatHold, now: Instant): boolean;
/**
 * Capacity tiers: they WIDEN, never shrink after going on sale.
 *
 * Shrinking after going on sale would cancel seats already sold. That is an
 * invariant, not a precaution.
 */
export declare function assertTierWidens(currentCapacity: number, nextCapacity: number): void;
/**
 * The TECHNICAL PROVISIONING threshold and its parameters — CONTRACT DATA, not
 * constants copied onto five surfaces.
 *
 * Beyond 10,000 concurrent viewers, the infrastructure is provisioned in
 * advance; a forecast far above the real figure exposes you to a penalty;
 * revisable up to 72 h before.
 */
export declare const TECHNICAL_PROVISION_THRESHOLD = 10000;
export declare const PROVISION_REVISION_HOURS = 72;
export declare function requiresTechnicalProvision(capacityTotal: number): boolean;
/**
 * The priority window granted to the waiting list when a tier opens.
 *
 * ⚠ Opening a tier NOTIFIES THE LIST IN THE SAME ACT: it is ONE transactional
 * command, not two. Two calls would let the scarcity dissipate between them —
 * by the time the list was notified, the public would have taken the seats.
 */
export declare const WAITLIST_PRIORITY_HOURS = 2;
//# sourceMappingURL=seats.d.ts.map