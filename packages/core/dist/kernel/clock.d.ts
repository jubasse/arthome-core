/**
 * The clock is a PORT, never a `Date.now()` buried inside a rule.
 *
 * This is the most invasive reshaping of the port, and it is not negotiable.
 * `shared/helpers.js` reads an implicit clock deep inside `stateOf`,
 * `isRoomOpen`, `replayHoursLeft` and `dayLabel`; and all of `shared/` is built
 * on offsets relative to app open — `catalogue.json` says so itself: "nothing
 * here expires". Excellent for a mockup, unusable in a contract.
 *
 * Two consequences:
 *   - a rule that reads the system clock is not testable. A test that passes at
 *     23:59 and fails at 00:01 has found a forgotten `Date.now()`;
 *   - a package imported by seven services CANNOT hold global state. Two
 *     concurrent requests would share the same clock, the same language and the
 *     same country.
 */
/** An instant, in ISO 8601 UTC. Never an offset in minutes (D7). */
export type Instant = string;
export interface Clock {
    /** The current instant, in ISO 8601 UTC. */
    now(): Instant;
    /** The same instant in milliseconds since the epoch, for arithmetic. */
    nowMs(): number;
}
/** The production clock. The only one that reads the machine's time. */
export declare class SystemClock implements Clock {
    now(): Instant;
    nowMs(): number;
}
/**
 * The clock for tests and for the deterministic dataset.
 *
 * `advance` exists for window tests — replay expiry, playback lease, quote
 * validity — where the whole point is to make an instant pass.
 */
export declare class FixedClock implements Clock {
    private ms;
    constructor(instant: Instant | number);
    now(): Instant;
    nowMs(): number;
    /** Advances the clock. Returns the instant reached. */
    advance(millis: number): Instant;
}
//# sourceMappingURL=clock.d.ts.map