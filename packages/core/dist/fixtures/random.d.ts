/**
 * A DETERMINISTIC pseudo-random generator.
 *
 * `fixtures.js` has a second life after the port: a test and demonstration data
 * set. Being deterministic, it produces the same catalogue on every run — a
 * solid base for integration tests and staging environments.
 *
 * ⚠ `Math.random()` is banned here, and not out of purism: a non-reproducible
 * data set makes a test flaky, and a flaky test ends up disabled. It is also
 * what lets the `FakePaymentAdapter` run WITH NO KEY AND NO NETWORK, which the
 * public demonstration requires.
 */
/**
 * Mulberry32 — thirty-two bits of state, one multiplication, three shifts.
 *
 * Chosen for what it does not have: no dependency, no platform API, and
 * identical behaviour under Node, Metro and a browser. Its statistical quality
 * is more than enough to spread dates across a calendar; we encrypt nothing
 * with it.
 */
export declare class DeterministicRandom {
    private state;
    constructor(seed: number);
    /** A float in `[0, 1)`. */
    next(): number;
    /** An integer in `[min, max]`, bounds included. */
    intBetween(min: number, max: number): number;
    /** One element, or `null` if the list is empty — never `undefined`. */
    pick<T>(values: readonly T[]): T | null;
    chance(probability: number): boolean;
}
//# sourceMappingURL=random.d.ts.map