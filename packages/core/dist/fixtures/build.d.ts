/**
 * The deterministic data set.
 *
 * WHAT CHANGES AGAINST `fixtures.js`: it produces INSTANTS, not offsets.
 * `catalogue.json` says it itself — "startOffsetMin, atMin and
 * rescheduledToOffsetMin are offsets from the moment the app is opened […]
 * NOTHING HERE EXPIRES". That is excellent for a mockup, where every state
 * exists at any hour and all five surfaces see the same thing. It is unusable
 * in a contract.
 *
 * Converting back to relative offsets, if a demonstration still needs it,
 * becomes a PRESENTATION CONVENIENCE and not a transported shape.
 *
 * AND WHAT IT COVERS. This module does not reproduce the original
 * generator's 1,814 dates: it produces the CASES THAT HURT, the ones the
 * integration tests and the demonstration must exercise. A volume of plausible
 * data proves nothing; one outcome of each kind, a replay window about to
 * expire and a territorial blackout prove something.
 */
import type { DateTiming } from '../catalog/date-state.js';
import type { LanguageProfile } from '../catalog/language.js';
import { type TerritoryRights } from '../catalog/rights.js';
import type { Clock, Instant } from '../kernel/clock.js';
import type { TierPrice } from '../ticketing/pricing.js';
import type { Gauge } from '../ticketing/seats.js';
import { type VenueClock } from '../time/venue-clock.js';
import { DateOutcome, PublicationState, RunState } from '../vocabulary/catalog.js';
export interface FixtureVenue {
    readonly id: string;
    readonly city: string;
    readonly country: string;
    readonly clock: VenueClock;
    readonly capacity: number;
}
export interface FixtureDate {
    readonly id: string;
    readonly showId: string;
    readonly venueId: string;
    readonly timing: DateTiming;
    readonly publicationState: PublicationState;
    readonly runState: RunState | null;
    readonly outcome: DateOutcome | null;
    readonly rights: TerritoryRights;
    readonly language: LanguageProfile;
    readonly gauge: Gauge;
    readonly prices: readonly TierPrice[];
    /** The case this date exists to exercise. Readable in a test failure. */
    readonly covers: string;
}
export interface Fixtures {
    readonly seed: number;
    readonly generatedAt: Instant;
    readonly venues: readonly FixtureVenue[];
    readonly dates: readonly FixtureDate[];
}
/**
 * Builds the deterministic set.
 *
 * The clock is INJECTED: two calls with the same seed and the same clock
 * produce exactly the same set. That is what makes an integration test
 * reproducible six months apart.
 */
export declare function buildFixtures(seed: number, clock: Clock): Fixtures;
/** Finds a case by its identifier — so a test can name what it exercises. */
export declare function fixtureDate(fixtures: Fixtures, id: string): FixtureDate | null;
//# sourceMappingURL=build.d.ts.map