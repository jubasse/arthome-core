/**
 * The clock is a PORT, never a `Date.now()` buried in a rule: a rule that reads
 * the system clock is not testable, and a package imported by seven services
 * cannot hold a global clock.
 */
/** An instant, in ISO 8601 UTC. Never an offset in minutes (D7). */
export type Instant = string;
export interface Clock {
    now(): Instant;
    nowMs(): number;
}
/** The production clock. The only one that reads the machine's time. */
export declare class SystemClock implements Clock {
    now(): Instant;
    nowMs(): number;
}
/** The clock for tests and for the deterministic data set. */
export declare class FixedClock implements Clock {
    private ms;
    constructor(instant: Instant | number);
    now(): Instant;
    nowMs(): number;
    advance(millis: number): Instant;
}
//# sourceMappingURL=clock.d.ts.map