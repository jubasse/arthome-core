/**
 * `Math.random()` is banned in the fixtures: a non-reproducible data set makes
 * a test flaky and a flaky test ends up disabled. Determinism is also what lets
 * the `FakePaymentAdapter` run with no key and no network.
 */
/** Mulberry32 — deterministic, dependency-free, identical under Node, Metro and a browser. */
export declare class DeterministicRandom {
    private state;
    constructor(seed: number);
    /** A float in `[0, 1)`. */
    next(): number;
    /** An integer in `[min, max]`, bounds included. */
    intBetween(min: number, max: number): number;
    pick<T>(values: readonly T[]): T | null;
    chance(probability: number): boolean;
}
//# sourceMappingURL=random.d.ts.map