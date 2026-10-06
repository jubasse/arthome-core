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
    /** The open priority pool's seats neither held nor sold; 0 outside a window (adr-ticketing.md §9). */
    readonly priorityPoolSeats: number;
}
/**
 * The PUBLIC count: net of holds in progress and of the priority pool, which only an account
 * notified into the window buys from. The public sees a date sold out while the pool is open.
 */
export declare function seatsAvailable(gauge: Gauge): number;
/** What one account may buy: the public count, and the pool too for an account notified into it. */
export declare function seatsAvailableTo(gauge: Gauge, account: {
    readonly inPriorityPool: boolean;
}): number;
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
 * A hold expires at the SAME INSTANT as the intent that created it — never
 * two durations that drift — and is placed when the intent OPENS, not at its
 * approval: the TV shows the code, so capacity must be true from then.
 */
export declare const HOLD_MINUTES_CHECKOUT = 15;
export declare const HOLD_MINUTES_TV_PAIRING = 5;
/**
 * How long an admission out of a date's sales queue lets its account buy that date
 * (adr-ticketing.md §4). Unused by then, it lapses and the account queues again.
 */
export declare const SALES_QUEUE_ADMISSION_SECONDS = 60;
/**
 * At most one `availability_changed` per date in this interval while the date keeps moving.
 * Selling out and coming back from sold out publish at once: they change what surfaces offer.
 */
export declare const AVAILABILITY_PUBLISH_MIN_INTERVAL_SECONDS = 5;
/**
 * How long a date's availability read holds from its `servedAt`: short, because the "show already
 * started" price it carries is pro rata of the time remaining.
 */
export declare const AVAILABILITY_VALID_SECONDS = 60;
export declare function availabilityValidUntil(servedAt: Instant): Instant;
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
/** A seat's cancellation deadline, served as an instant (data-model.md §3.3), never a sentence. */
export declare function seatCancelDeadline(startsAt: Instant): Instant;
/**
 * Capacity tiers: they WIDEN, never shrink after going on sale. Shrinking then
 * would cancel seats already sold.
 */
export declare function assertTierWidens(currentCapacity: number, nextCapacity: number): void;
/**
 * The TECHNICAL PROVISIONING threshold and its parameters — CONTRACT DATA, not
 * constants copied onto five surfaces. A forecast far above the real figure
 * exposes you to a penalty, and is revisable until `PROVISION_REVISION_HOURS`
 * before the date.
 */
export declare const TECHNICAL_PROVISION_THRESHOLD = 10000;
export declare const PROVISION_REVISION_HOURS = 72;
export declare function requiresTechnicalProvision(capacityTotal: number): boolean;
export declare function provisionRevisableUntil(startsAt: Instant): Instant;
/**
 * Refuses a capacity beyond the threshold that no recorded provision covers. `provisionedCapacity`
 * is null while none is recorded; `startsAt` is null while the date has no start, and the refusal
 * then names no deadline.
 */
export declare function assertTechnicalProvisionCovers(capacityTotal: number, provisionedCapacity: number | null, startsAt: Instant | null): void;
/**
 * Refuses to record a provision from `provisionRevisableUntil` on, or one below the capacity already
 * open (D-088). A date with no start has no deadline yet.
 */
export declare function assertTechnicalProvisionRecordable(capacityTotal: number, provisionedCapacity: number, startsAt: Instant | null, now: Instant): void;
/**
 * The priority window granted to the waiting list when a tier opens.
 *
 * Opening a tier notifies the list in the SAME transactional command; two
 * calls let the public take the seats before the list hears of it.
 */
export declare const WAITLIST_PRIORITY_HOURS = 2;
/** One `waitlist.notified` names at most this many accounts; a tier opening writes as many as it needs. */
export declare const WAITLIST_NOTIFIED_ACCOUNTS_MAX = 500;
/** adr-ticketing.md §6: how many expired holds one pass of the sweeper's one-second loop takes. */
export declare const HOLD_EXPIRY_BATCH = 500;
/** D-089: a seat covers the live alone, sold until this long after its start, every channel alike. */
export declare const SEAT_SALES_CUTOFF_MINUTES_AFTER_START = 30;
export declare function seatSalesEndAt(startsAt: Instant): Instant;
/** Past the sale's end by time; a date with no start has no end. */
export declare function salesEndedBy(salesEndAt: Instant | null, now: Instant): boolean;
/** What a buyer arriving after the start is told, and must acknowledge, before buying (D-089). */
export interface LateEntry {
    readonly startedAt: Instant;
    /** Whole minutes of the live already missed. */
    readonly minutesElapsed: number;
    readonly salesEndAt: Instant;
}
/** Null before the start, and for a date with none. */
export declare function lateEntryOf(startsAt: Instant | null, now: Instant): LateEntry | null;
//# sourceMappingURL=seats.d.ts.map