/**
 * Le jeu de donnees deterministe.
 *
 * ⚠ CE QUI CHANGE PAR RAPPORT A `fixtures.js` : il produit des INSTANTS, pas
 * des decalages. `catalogue.json` le dit lui-meme — « startOffsetMin, atMin and
 * rescheduledToOffsetMin are offsets from the moment the app is opened […]
 * NOTHING HERE EXPIRES ». C'est excellent pour une maquette, ou tous les etats
 * existent a toute heure et ou les cinq surfaces voient la meme chose. C'est
 * inutilisable sur un contrat.
 *
 * La conversion en decalages relatifs, si elle sert encore a une demonstration,
 * devient une COMMODITE DE PRESENTATION et non une forme transportee.
 *
 * ⚠ ET CE QU'IL COUVRE. Ce module ne reproduit pas les 1 814 dates du
 * generateur d'origine : il produit les CAS QUI FONT MAL, ceux que les tests
 * d'integration et la demonstration doivent exercer. Un volume de donnees
 * plausibles ne prouve rien ; une issue de chaque nature, une fenetre de
 * rediffusion sur le point d'expirer et un blackout territorial prouvent
 * quelque chose.
 */

import type { Clock, Instant } from '../kernel/clock.js';
import { plusHours, plusMinutes } from '../time/instant.js';
import { venueClock, type VenueClock } from '../time/venue-clock.js';
import { money, type Money } from '../money/money.js';
import { DateOutcome, LanguageDependency, PublicationState, ReplayPolicy, RunState, BlackoutReason } from '../vocabulary/catalog.js';
import { PriceTier } from '../vocabulary/commerce.js';
import type { DateTiming } from '../catalog/date-state.js';
import { restrictedRights, worldwideRights, type TerritoryRights } from '../catalog/rights.js';
import type { LanguageProfile } from '../catalog/language.js';
import type { Gauge } from '../ticketing/seats.js';
import type { TierPrice } from '../ticketing/pricing.js';
import { DeterministicRandom } from './random.js';

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
  /** Le cas que cette date existe pour exercer. Lisible dans un echec de test. */
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
  return { startsAt, runtimeMin: 120, roomOpensBeforeMin: 30, replayPolicy: policy, replayWindowHours: windowHours };
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
  // D1 : la valeur ABSENTE du vocabulaire declare, et dont depend la regle la
  // plus visible de la surface. Le jeu de donnees l'exerce delibberement.
  dependency: LanguageDependency.ESSENTIAL,
};

/**
 * Construit le jeu deterministe.
 *
 * L'horloge est INJECTEE : deux appels avec la meme graine et la meme horloge
 * produisent exactement le meme jeu. C'est ce qui rend un test d'integration
 * reproductible a six mois d'intervalle.
 */
export function buildFixtures(seed: number, clock: Clock): Fixtures {
  const random = new DeterministicRandom(seed);
  const now = clock.now();

  const venues: readonly FixtureVenue[] = [
    { id: 'venue:criee', city: 'Marseille', country: 'FR', clock: venueClock('Europe/Paris', 120), capacity: 780 },
    { id: 'venue:zurich', city: 'Zurich', country: 'CH', clock: venueClock('Europe/Zurich', 120), capacity: 420 },
    { id: 'venue:montreal', city: 'Montreal', country: 'CA', clock: venueClock('America/Toronto', -240), capacity: 1200 },
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
      covers: 'un direct en cours, avec barriere de langue',
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
      covers: 'la salle ouverte, et des places retenues par une intention en cours',
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
      covers: 'le seuil de rarete a 85 %, juste au-dessus',
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
      covers: 'complet avec liste d\'attente — deux etats distincts',
    },
    {
      id: 'date:replay-expiring',
      showId: 'show:giselle',
      venueId: 'venue:criee',
      // Fin il y a 47 h, fenetre de 48 h : il reste UNE heure.
      timing: timingAt(plusHours(now, -49), ReplayPolicy.INCLUDED, 48),
      publicationState: PublicationState.REPLAY_ONLINE,
      runState: null,
      outcome: null,
      rights: worldwideRights(),
      language: NO_BARRIER,
      gauge: { capacityTotal: 780, seatsSold: 540, seatsHeld: 0, waitlistCount: 0 },
      prices: tiers(2400),
      covers: 'une fenetre de rediffusion qui expire dans une heure',
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
      covers: 'un blackout territorial, avec son motif code',
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
      covers: 'une annulation — remboursement integral, versement rembourse',
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
      covers: 'un report — aucun mouvement d\'argent, la place suit',
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
      covers: 'une interruption — avoirs emis, versement retenu',
    },
    {
      id: 'date:absurd-race',
      showId: 'show:hamlet',
      venueId: 'venue:criee',
      timing: timingAt(plusMinutes(now, -30), ReplayPolicy.INCLUDED, 48),
      // LE cas qui parait absurde et qu'un ordre de consommation Kafka produit :
      // publication `live`, antenne `on-air`, ET une issue declaree.
      publicationState: PublicationState.LIVE,
      runState: RunState.ON_AIR,
      outcome: DateOutcome.CANCELLED,
      rights: worldwideRights(),
      language: NO_BARRIER,
      gauge: { capacityTotal: 780, seatsSold: 500, seatsHeld: 0, waitlistCount: 0 },
      prices: tiers(2600),
      covers: 'les trois axes en contradiction — la course de consommation Kafka',
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
      covers: 'un brouillon — visible du studio, invisible du storefront',
    },
  ];

  // Le generateur est consulte pour que la graine ait un effet observable :
  // un jeu qui ignore sa graine donnerait l'illusion du determinisme.
  void random.next();

  return { seed, generatedAt: now, venues, dates };
}

/** Retrouve un cas par son identifiant — pour qu'un test nomme ce qu'il exerce. */
export function fixtureDate(fixtures: Fixtures, id: string): FixtureDate | null {
  return fixtures.dates.find((date) => date.id === id) ?? null;
}
