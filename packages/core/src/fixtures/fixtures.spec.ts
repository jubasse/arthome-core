import { describe, expect, it } from 'vitest';

import { buildFixtures, fixtureDate } from './index.js';
import { DeterministicRandom } from './random.js';
import { displayStateOf } from '../catalog/date-state.js';
import { FixedClock } from '../kernel/clock.js';
import { replayHoursLeft } from '../replay/index.js';
import { DisplayState } from '../vocabulary/catalog.js';

const clock = (): FixedClock => new FixedClock('2026-09-21T20:00:00.000Z');

/**
 * PROTECTED INVARIANT
 *   The data set is DETERMINISTIC: same seed, same clock, same set.
 *
 * WHY
 *   A non-reproducible set makes a test flaky, and a flaky test ends up
 *   disabled. It is also what lets the `FakePaymentAdapter` run with no key and
 *   no network, which the public demonstration requires.
 */
describe('determinism', () => {
  it('produces exactly the same set at equal seed and clock', () => {
    expect(buildFixtures(42, clock())).toEqual(buildFixtures(42, clock()));
  });

  it('produces a reproducible sequence', () => {
    const first = new DeterministicRandom(7);
    const second = new DeterministicRandom(7);
    const draw = (r: DeterministicRandom): readonly number[] => [r.next(), r.next(), r.next()];
    expect(draw(first)).toEqual(draw(second));
  });

  it('never returns `undefined` on an empty list', () => {
    // `noUncheckedIndexedAccess` makes this case visible; the signature makes it safe.
    expect(new DeterministicRandom(1).pick([])).toBeNull();
  });
});

/**
 * PROTECTED INVARIANT
 *   The set covers THE CASES THAT HURT, not a volume of plausible data.
 *
 * WHY
 *   A plausible volume proves nothing. One outcome of each kind, a window about
 *   to expire and a territorial blackout prove something — and each case
 *   carries the reason for its existence in `covers`, readable in a test
 *   failure.
 */
describe("the set's coverage", () => {
  const fixtures = buildFixtures(42, clock());

  it('exercises the three outcomes', () => {
    for (const id of ['date:cancelled', 'date:postponed', 'date:interrupted']) {
      expect(fixtureDate(fixtures, id)?.outcome).not.toBeNull();
    }
  });

  it('carries the case of the three axes in contradiction', () => {
    // The Kafka consumption race, made concrete: publication `live`, on air
    // `on-air`, AND a declared outcome. The outcome must win.
    const date = fixtureDate(fixtures, 'date:absurd-race');
    expect(date).not.toBeNull();
    if (date === null) return;

    const display = displayStateOf({
      publicationState: date.publicationState,
      runState: date.runState,
      outcome: date.outcome,
      timing: date.timing,
      now: fixtures.generatedAt,
    });
    expect(display.state).toBe(DisplayState.CANCELLED);
  });

  it('carries a replay window expiring within the hour', () => {
    const date = fixtureDate(fixtures, 'date:replay-expiring');
    expect(date).not.toBeNull();
    if (date === null) return;
    expect(replayHoursLeft(date.timing, fixtures.generatedAt)).toBe(1);
  });

  it('carries seats held by an intent in progress', () => {
    // The case that existed nowhere before `SeatHold`.
    expect(fixtureDate(fixtures, 'date:room-open')?.gauge.seatsHeld).toBeGreaterThan(0);
  });

  it('gives each case the reason for its existence', () => {
    for (const date of fixtures.dates) {
      expect(date.covers.length).toBeGreaterThan(10);
    }
  });
});
