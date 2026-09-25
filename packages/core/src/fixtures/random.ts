/**
 * ⚠ `Math.random()` is banned in the fixtures: a non-reproducible data set makes
 * a test flaky and a flaky test ends up disabled. Determinism is also what lets
 * the `FakePaymentAdapter` run with no key and no network.
 */

/** Mulberry32 — deterministic, dependency-free, identical under Node, Metro and a browser. */
export class DeterministicRandom {
  private state: number;

  public constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** A float in `[0, 1)`. */
  public next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  }

  /** An integer in `[min, max]`, bounds included. */
  public intBetween(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  public pick<T>(values: readonly T[]): T | null {
    if (values.length === 0) return null;
    return values[this.intBetween(0, values.length - 1)] ?? null;
  }

  public chance(probability: number): boolean {
    return this.next() < probability;
  }
}
