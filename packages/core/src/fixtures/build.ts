/**
 * The deterministic data set.
 *
 * ⚠ WHAT CHANGES AGAINST `fixtures.js`: it produces INSTANTS, not offsets.
 * `catalogue.json` says it itself — "startOffsetMin, atMin and
 * rescheduledToOffsetMin are offsets from the moment the app is opened […]
 * NOTHING HERE EXPIRES". That is excellent for a mockup, where every state
 * exists at any hour and all five surfaces see the same thing. It is unusable
 * in a contract.
 *
 * Converting back to relative offsets, if a demonstration still needs it,
 * becomes a PRESENTATION CONVENIENCE and not a transported shape.
 *
 * ⚠ AND WHAT IT COVERS. This module does not reproduce the original
 * generator's 1,814 dates: it produces the CASES THAT HURT, the ones the
 * integration tests and the demonstration must exercise. A volume of plausible
 * data proves nothing; one outcome of each kind, a replay window about to
 * expire and a territorial blackout prove something.
 */

import { DeterministicRandom } from './random.js';
import type { DateTiming } from '../catalog/date-state.js';
import type { LanguageProfile } from '../catalog/language.js';
import { restrictedRights, worldwideRights, type TerritoryRights } from '../catalog/rights.js';
import type { Clock, Instant } from '../kernel/clock.js';
import { money, type Money } from '../money/money.js';
import type { TierPrice } from '../ticketing/pricing.js';
import type { Gauge } from '../ticketing/seats.js';
import { plusHours, plusMinutes } from '../time/instant.js';
import { venueClock, type VenueClock } from '../time/venue-clock.js';
import {
  DateOutcome,
  LanguageDependency,
  PublicationState,
  ReplayPolicy,
  RunState,
  BlackoutReason,
} from '../vocabulary/catalog.js';
import { PriceTier } from '../vocabulary/commerce.js';

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

const EUR = (amountMinor: number): Money => money(amountMinor, 'EUR');

function tiers(full: number): readonly TierPrice[] {
  return [
    { tier: PriceTier.FULL, amount: EUR(full), active: true },
    { tier: PriceTier.REDUCED, amount: EUR(Math.round(full * 0.7)), active: true },
    { tier: PriceTier.SUPPORT, amount: EUR(Math.round(full * 1.7)), active: true },
  ];
}

function timingAt(startsAt: Instant, policy: ReplayPolicy, windowHours: number): DateTiming {
  return {
    startsAt,
    runtimeMin: 120,
    roomOpensBeforeMin: 30,
    replayPolicy: policy,
    replayWindowHours: windowHours,
  };
}

const NO_BARRIER: LanguageProfile = {
  spoken: [],
  subtitles: [],
  surtitles: [],
  dependency: LanguageDependency.NONE,
};

const FRENCH_ESSENTIAL: LanguageProfile = {
  spoken: ['fr'],
  subtitles: ['en'],
  surtitles: [],
  // D1: the value ABSENT from the declared vocabulary, and on which the
  // surface's most visible rule depends. The data set exercises it deliberately.
  dependency: LanguageDependency.ESSENTIAL,
};

/**
 * Builds the deterministic set.
 *
 * The clock is INJECTED: two calls with the same seed and the same clock
 * produce exactly the same set. That is what makes an integration test
 * reproducible six months apart.
 */
export function buildFixtures(seed: number, clock: Clock): Fixtures {
  const random = new DeterministicRandom(seed);
  const now = clock.now();

  const venues: readonly FixtureVenue[] = [
    {
      id: 'venue:criee',
      city: 'Marseille',
      country: 'FR',
      clock: venueClock('Europe/Paris', 120),
      capacity: 780,
    },
    {
      id: 'venue:zurich',
      city: 'Zurich',
      country: 'CH',
      clock: venueClock('Europe/Zurich', 120),
      capacity: 420,
    },
    {
      id: 'venue:montreal',
      city: 'Montreal',
      country: 'CA',
      clock: venueClock('America/Toronto', -240),
      capacity: 1200,
    },
  ];

  const dates: readonly FixtureDate[] = [
    {
      id: 'date:live-now',
      showId: 'show:la-mouette',
      venueId: 'venue:criee',
      timing: timingAt(plusMinutes(now, -30), ReplayPolicy.INCLUDED, 48),
      publicationState: PublicationState.LIVE,
      runState: RunState.ON_AIR,
      outcome: null,
      rights: worldwideRights(),
      language: FRENCH_ESSENTIAL,
      gauge: { capacityTotal: 780, seatsSold: 694, seatsHeld: 0, waitlistCount: 0 },
      prices: tiers(2600),
      covers: 'a live show in progress, with a language barrier',
    },
    {
      id: 'date:room-open',
      showId: 'show:nocturnes',
      venueId: 'venue:criee',
      timing: timingAt(plusMinutes(now, 20), ReplayPolicy.INCLUDED, 48),
      publicationState: PublicationState.SCHEDULED,
      runState: RunState.IDLE,
      outcome: null,
      rights: worldwideRights(),
      language: NO_BARRIER,
      gauge: { capacityTotal: 780, seatsSold: 700, seatsHeld: 4, waitlistCount: 0 },
      prices: tiers(3200),
      covers: 'the room open, and seats held by an intent in progress',
    },
    {
      id: 'date:scarce',
      showId: 'show:gravite',
      venueId: 'venue:zurich',
      timing: timingAt(plusHours(now, 72), ReplayPolicy.SUBSCRIPTION, 200),
      publicationState: PublicationState.SCHEDULED,
      runState: RunState.IDLE,
      outcome: null,
      rights: worldwideRights(),
      language: NO_BARRIER,
      gauge: { capacityTotal: 420, seatsSold: 361, seatsHeld: 0, waitlistCount: 0 },
      prices: tiers(2800),
      covers: 'the scarcity threshold at 85%, just above it',
    },
    {
      id: 'date:sold-out-waitlist',
      showId: 'show:carmen',
      venueId: 'venue:montreal',
      timing: timingAt(plusHours(now, 120), ReplayPolicy.UNIT, 72),
      publicationState: PublicationState.SCHEDULED,
      runState: RunState.IDLE,
      outcome: null,
      rights: worldwideRights(),
      language: NO_BARRIER,
      gauge: { capacityTotal: 1200, seatsSold: 1200, seatsHeld: 0, waitlistCount: 340 },
      prices: tiers(3800),
      covers: 'sold out with a waiting list — two distinct states',
    },
    {
      id: 'date:replay-expiring',
      showId: 'show:giselle',
      venueId: 'venue:criee',
      // Ended 47 h ago, a 48 h window: ONE hour left.
      timing: timingAt(plusHours(now, -49), ReplayPolicy.INCLUDED, 48),
      publicationState: PublicationState.REPLAY_ONLINE,
      runState: null,
      outcome: null,
      rights: worldwideRights(),
      language: NO_BARRIER,
      gauge: { capacityTotal: 780, seatsSold: 540, seatsHeld: 0, waitlistCount: 0 },
      prices: tiers(2400),
      covers: 'a replay window expiring in one hour',
    },
    {
      id: 'date:blackout',
      showId: 'show:le-sacre',
      venueId: 'venue:criee',
      timing: timingAt(plusHours(now, 48), ReplayPolicy.INCLUDED, 48),
      publicationState: PublicationState.SCHEDULED,
      runState: RunState.IDLE,
      outcome: null,
      rights: restrictedRights(['BE', 'CH'], BlackoutReason.CO_PRODUCTION),
      language: NO_BARRIER,
      gauge: { capacityTotal: 780, seatsSold: 120, seatsHeld: 0, waitlistCount: 0 },
      prices: tiers(3000),
      covers: 'a territorial blackout, with its reason as a code',
    },
    {
      id: 'date:cancelled',
      showId: 'show:ellipse',
      venueId: 'venue:zurich',
      timing: timingAt(plusHours(now, -24), ReplayPolicy.NONE, 0),
      publicationState: PublicationState.ENDED,
      runState: null,
      outcome: DateOutcome.CANCELLED,
      rights: worldwideRights(),
      language: NO_BARRIER,
      gauge: { capacityTotal: 420, seatsSold: 380, seatsHeld: 0, waitlistCount: 0 },
      prices: tiers(2200),
      covers: 'a cancellation — full refund, payout refunded',
    },
    {
      id: 'date:postponed',
      showId: 'show:quatre-mains',
      venueId: 'venue:criee',
      timing: timingAt(plusHours(now, -6), ReplayPolicy.INCLUDED, 48),
      publicationState: PublicationState.SCHEDULED,
      runState: RunState.IDLE,
      outcome: DateOutcome.POSTPONED,
      rights: worldwideRights(),
      language: NO_BARRIER,
      gauge: { capacityTotal: 780, seatsSold: 410, seatsHeld: 0, waitlistCount: 0 },
      prices: tiers(2600),
      covers: 'a postponement — no movement of money, the seat follows',
    },
    {
      id: 'date:interrupted',
      showId: 'show:voix-basses',
      venueId: 'venue:montreal',
      timing: timingAt(plusHours(now, -3), ReplayPolicy.INCLUDED, 48),
      publicationState: PublicationState.ENDED,
      runState: RunState.ENDED,
      outcome: DateOutcome.INTERRUPTED,
      rights: worldwideRights(),
      language: NO_BARRIER,
      gauge: { capacityTotal: 1200, seatsSold: 890, seatsHeld: 0, waitlistCount: 0 },
      prices: tiers(3400),
      covers: 'an interruption — credits issued, payout withheld',
    },
    {
      id: 'date:absurd-race',
      showId: 'show:hamlet',
      venueId: 'venue:criee',
      timing: timingAt(plusMinutes(now, -30), ReplayPolicy.INCLUDED, 48),
      // THE case that looks absurd and that a Kafka consumption order produces:
      // publication `live`, on air `on-air`, AND a declared outcome.
      publicationState: PublicationState.LIVE,
      runState: RunState.ON_AIR,
      outcome: DateOutcome.CANCELLED,
      rights: worldwideRights(),
      language: NO_BARRIER,
      gauge: { capacityTotal: 780, seatsSold: 500, seatsHeld: 0, waitlistCount: 0 },
      prices: tiers(2600),
      covers: 'the three axes in contradiction — the Kafka consumption race',
    },
    {
      id: 'date:draft',
      showId: 'show:plateau-libre',
      venueId: 'venue:zurich',
      timing: timingAt(plusHours(now, 720), ReplayPolicy.INCLUDED, 48),
      publicationState: PublicationState.DRAFT,
      runState: null,
      outcome: null,
      rights: worldwideRights(),
      language: NO_BARRIER,
      gauge: { capacityTotal: 420, seatsSold: 0, seatsHeld: 0, waitlistCount: 0 },
      prices: [],
      covers: 'a draft — visible from the studio, invisible from the storefront',
    },
  ];

  // The generator is consulted so the seed has an observable effect: a set that
  // ignored its seed would give the illusion of determinism.
  void random.next();

  return { seed, generatedAt: now, venues, dates };
}

/** Finds a case by its identifier — so a test can name what it exercises. */
export function fixtureDate(fixtures: Fixtures, id: string): FixtureDate | null {
  return fixtures.dates.find((date) => date.id === id) ?? null;
}
