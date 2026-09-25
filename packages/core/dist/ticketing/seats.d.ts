/** Capacity, tiers, and the HOLD that stops capacity lying. */
import type { Instant } from '../kernel/clock.js';
/**
 * The capacity state, as a DISCRIMINATED UNION. A label — "86 seats", "Sold
 * out" — cannot be filtered or sorted, and leaks i18n into the domain.
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
    readonly seatsHeld: number;
    readonly waitlistCount: number;
}
/** The seats ACTUALLY available: net of holds in progress. */
export declare function seatsAvailable(gauge: Gauge): number;
export declare function availabilityOf(gauge: Gauge): SeatAvailability;
/**
 * The fill RATE, in basis points — and not the capacity. Serving the capacity
 * and recomputing the rate per surface composes one value twice; the mockup
 * proved it with a constant 2,000 seats independent of the venue.
 */
export declare function fillRateBps(gauge: Gauge): number;
/**
 * "Almost full" — and the THRESHOLD is a domain rule, not an interface literal.
 * 8,500 bps is 85 %, the same number as the "almost full" notification: a card
 * that says it and an alert that never fires would be incomprehensible.
 */
export declare const SCARCITY_THRESHOLD_BPS = 8500;
export declare function isScarce(gauge: Gauge): boolean;
/**
 * THE CAPACITY HOLD, and its SINGLE-INSTANT invariant.
 *
 * ⚠ A hold expires at the SAME INSTANT as the intent that created it — never
 * two durations that drift — and is placed when the intent OPENS, not at its
 * approval: the TV shows the code, so capacity must be true from then.
 */
export declare const HOLD_MINUTES_CHECKOUT = 15;
export declare const HOLD_MINUTES_TV_PAIRING = 5;
export interface SeatHold {
    readonly quantity: number;
    readonly expiresAt: Instant;
}
/** Places a hold whose expiry IS the intent's. */
export declare function holdFor(quantity: number, intentExpiresAt: Instant): SeatHold;
/** The intent duration for a direct checkout journey. */
export declare function checkoutIntentExpiry(openedAt: Instant): Instant;
/** The intent duration for a TV pairing — five minutes, not fifteen. */
export declare function tvPairingIntentExpiry(openedAt: Instant): Instant;
export declare function isHoldExpired(hold: SeatHold, now: Instant): boolean;
/**
 * Capacity tiers: they WIDEN, never shrink after going on sale. Shrinking then
 * would cancel seats already sold.
 */
export declare function assertTierWidens(currentCapacity: number, nextCapacity: number): void;
/**
 * The TECHNICAL PROVISIONING threshold and its parameters — CONTRACT DATA, not
 * constants copied onto five surfaces. A forecast far above the real figure
 * exposes you to a penalty, and is revisable up to 72 h before.
 */
export declare const TECHNICAL_PROVISION_THRESHOLD = 10000;
export declare const PROVISION_REVISION_HOURS = 72;
export declare function requiresTechnicalProvision(capacityTotal: number): boolean;
/**
 * The priority window granted to the waiting list when a tier opens.
 *
 * ⚠ Opening a tier notifies the list in the SAME transactional command; two
 * calls let the public take the seats before the list hears of it.
 */
export declare const WAITLIST_PRIORITY_HOURS = 2;
//# sourceMappingURL=seats.d.ts.map