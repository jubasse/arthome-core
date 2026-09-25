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
export class SystemClock implements Clock {
  public now(): Instant {
    return new Date().toISOString();
  }

  public nowMs(): number {
    return Date.now();
  }
}

/** The clock for tests and for the deterministic data set. */
export class FixedClock implements Clock {
  private ms: number;

  public constructor(instant: Instant | number) {
    this.ms = typeof instant === 'number' ? instant : Date.parse(instant);
  }

  public now(): Instant {
    return new Date(this.ms).toISOString();
  }

  public nowMs(): number {
    return this.ms;
  }

  public advance(millis: number): Instant {
    this.ms += millis;
    return this.now();
  }
}
