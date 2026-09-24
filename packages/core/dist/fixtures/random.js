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
export class DeterministicRandom {
    state;
    constructor(seed) {
        this.state = seed >>> 0;
    }
    /** A float in `[0, 1)`. */
    next() {
        this.state = (this.state + 0x6d2b79f5) >>> 0;
        let t = this.state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
    }
    /** An integer in `[min, max]`, bounds included. */
    intBetween(min, max) {
        return min + Math.floor(this.next() * (max - min + 1));
    }
    /** One element, or `null` if the list is empty — never `undefined`. */
    pick(values) {
        if (values.length === 0)
            return null;
        return values[this.intBetween(0, values.length - 1)] ?? null;
    }
    chance(probability) {
        return this.next() < probability;
    }
}
//# sourceMappingURL=random.js.map