import { describe, expect, it } from 'vitest';

import type { DateTiming } from '../catalog/date-state.js';
import { restrictedRights, worldwideRights } from '../catalog/rights.js';
import { BlackoutReason, DateOutcome, PublicationState, ReplayPolicy, RunState } from '../vocabulary/catalog.js';
import { PlanOpening } from '../vocabulary/commerce.js';
import {
  WatchDenialReason,
  WatchFallbackAction,
  concurrentStreamsAllowedFor,
  decideWatch,
  previewSecondsLeft,
  type WatchInput,
} from './index.js';

const timing: DateTiming = {
  startsAt: '2026-09-21T19:00:00.000Z',
  runtimeMin: 120,
  roomOpensBeforeMin: 30,
  replayPolicy: ReplayPolicy.INCLUDED,
  replayWindowHours: 48,
};

const base = (over: Partial<WatchInput> = {}): WatchInput => ({
  holdsSeat: false,
  planOpenings: [],
  concurrentStreamsOpen: 0,
  concurrentStreamsAllowed: 1,
  previewSecondsLeft: 300,
  viewerCountry: 'FR',
  rights: worldwideRights(),
  timing,
  publicationState: PublicationState.LIVE,
  runState: RunState.ON_AIR,
  outcome: null,
  replayOnSale: false,
  now: '2026-09-21T19:30:00.000Z',
  ...over,
});

/**
 * INVARIANT PROTEGE
 *   Un seul verdict, cinq entrees, et LE MEME vocabulaire de refus des deux
 *   cotes — a l'affichage comme a l'ouverture du lecteur.
 *
 * POURQUOI CE TEST EXISTE
 *   `isWatchable` supposait que le client detient la liste complete des places
 *   du compte : intenable sur mobile. Et le cas qui compte n'est pas le cas
 *   nominal — c'est celui ou DEUX refus s'appliquent en meme temps, ou le
 *   message affiche depend de l'ORDRE dans lequel on les teste.
 */
describe('decideWatch — la table de verite', () => {
  it('dit HORS TERRITOIRE a un detenteur de place, pas « pas de place »', () => {
    // Le cas qui decide de l'ordre des tests : acheter une place ne
    // debloquerait pas ce spectateur. Dire « pas de place » l'enverrait
    // depenser de l'argent pour rien.
    const verdict = decideWatch(
      base({
        holdsSeat: true,
        viewerCountry: 'BE',
        rights: restrictedRights(['BE'], BlackoutReason.CO_PRODUCTION),
      }),
    );

    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toBe(WatchDenialReason.OUT_OF_TERRITORY);
    expect(verdict.fallback).toBe(WatchFallbackAction.SEE_OTHER_DATES);
  });

  it('ouvre le direct a une place detenue — principe n°3', () => {
    const verdict = decideWatch(base({ holdsSeat: true }));
    expect(verdict.allowed).toBe(true);
    expect(verdict.scope).toBe('full');
  });

  it('ouvre un APERCU borne a qui n\'a pas de place', () => {
    const verdict = decideWatch(base({ previewSecondsLeft: 252 }));
    expect(verdict.allowed).toBe(true);
    expect(verdict.scope).toBe('preview');
    expect(verdict.previewSecondsLeft).toBe(252);
    expect(verdict.fallback).toBe(WatchFallbackAction.BUY_SEAT);
  });

  it("refuse quand l'apercu est epuise, avec l'action qui sort de l'impasse", () => {
    const verdict = decideWatch(base({ previewSecondsLeft: 0 }));
    expect(verdict.reason).toBe(WatchDenialReason.PREVIEW_EXHAUSTED);
    expect(verdict.fallback).toBe(WatchFallbackAction.BUY_SEAT);
  });

  it('propose de LIBERER UN ECRAN plutot que de refuser sechement', () => {
    const verdict = decideWatch(base({ holdsSeat: true, concurrentStreamsOpen: 1, concurrentStreamsAllowed: 1 }));
    expect(verdict.reason).toBe(WatchDenialReason.CONCURRENT_LIMIT_REACHED);
    expect(verdict.fallback).toBe(WatchFallbackAction.RELEASE_A_SCREEN);
  });

  it('refuse avant l\'ouverture de salle, meme avec une place', () => {
    const verdict = decideWatch(base({ holdsSeat: true, runState: RunState.IDLE, publicationState: PublicationState.SCHEDULED, now: '2026-09-21T12:00:00.000Z' }));
    expect(verdict.reason).toBe(WatchDenialReason.ROOM_NOT_OPEN);
    // Il a deja sa place : ne pas lui proposer d'en acheter une.
    expect(verdict.fallback).toBe(WatchFallbackAction.NONE);
  });

  it('ne laisse jamais regarder une date annulee, meme avec une place', () => {
    const verdict = decideWatch(base({ holdsSeat: true, outcome: DateOutcome.CANCELLED }));
    expect(verdict.reason).toBe(WatchDenialReason.DATE_CANCELLED);
  });

  it('ne laisse rien voir de ce qui n\'est pas publie', () => {
    const verdict = decideWatch(
      base({ holdsSeat: true, publicationState: PublicationState.DRAFT, runState: null }),
    );
    expect(verdict.reason).toBe(WatchDenialReason.NOT_PUBLISHED);
  });
});

/**
 * INVARIANT PROTEGE
 *   Les quatre politiques de rediffusion produisent QUATRE refus distincts.
 *
 * POURQUOI
 *   `storefront-tv` les liste separement : « aucune rediffusion pour cette
 *   date » et « rediffusion expiree » sont deux ecrans, « abonnement requis »
 *   en est un troisieme. Un code generique en produirait un faux.
 */
describe('decideWatch — les quatre politiques de rediffusion', () => {
  const replayNow = '2026-09-22T10:00:00.000Z';
  const replay = (over: Partial<WatchInput> = {}): WatchInput =>
    base({ publicationState: PublicationState.REPLAY_ONLINE, runState: null, now: replayNow, ...over });

  it('INCLUDED : une place detenue ouvre la rediffusion', () => {
    expect(decideWatch(replay({ holdsSeat: true })).allowed).toBe(true);
    expect(decideWatch(replay({ holdsSeat: false })).reason).toBe(WatchDenialReason.NO_SEAT);
  });

  it('SUBSCRIPTION : la formule ouvre, sinon on propose de s\'abonner', () => {
    const timingSub: DateTiming = { ...timing, replayPolicy: ReplayPolicy.SUBSCRIPTION };
    expect(decideWatch(replay({ timing: timingSub, planOpenings: [PlanOpening.REPLAYS] })).allowed).toBe(true);
    const refused = decideWatch(replay({ timing: timingSub, planOpenings: [] }));
    expect(refused.reason).toBe(WatchDenialReason.SUBSCRIPTION_REQUIRED);
    expect(refused.fallback).toBe(WatchFallbackAction.SUBSCRIBE);
  });

  it("UNIT : distingue « pas achetee » de « pas en vente »", () => {
    const timingUnit: DateTiming = { ...timing, replayPolicy: ReplayPolicy.UNIT };
    expect(decideWatch(replay({ timing: timingUnit, replayOnSale: true })).reason).toBe(WatchDenialReason.NO_SEAT);
    expect(decideWatch(replay({ timing: timingUnit, replayOnSale: false })).reason).toBe(
      WatchDenialReason.REPLAY_NOT_ON_SALE,
    );
  });

  it('NONE : aucune rediffusion, et ce n\'est pas « expiree »', () => {
    const timingNone: DateTiming = { ...timing, replayPolicy: ReplayPolicy.NONE, replayWindowHours: 0 };
    const verdict = decideWatch(replay({ timing: timingNone, holdsSeat: true, now: '2026-09-21T23:00:00.000Z' }));
    expect(verdict.reason).toBe(WatchDenialReason.NO_REPLAY);
  });

  it('distingue « expiree » de « aucune » une fois la fenetre passee', () => {
    const verdict = decideWatch(replay({ holdsSeat: true, now: '2026-09-25T00:00:00.000Z' }));
    expect(verdict.reason).toBe(WatchDenialReason.REPLAY_EXPIRED);
  });
});

/**
 * INVARIANT PROTEGE
 *   Le droit ne se met JAMAIS en cache : sa validite ne depasse pas 60 s.
 *
 * POURQUOI
 *   Il expire, il depend du territoire, il depend de la limite d'ecrans. Un
 *   droit relu depuis le disque est un droit FAUX — `storefront-mobile`,
 *   besoin n°5.
 */
describe('la validite d\'un verdict', () => {
  it('ne depasse jamais soixante secondes', () => {
    const verdict = decideWatch(base({ holdsSeat: true }));
    const delta = Date.parse(verdict.validUntil) - Date.parse('2026-09-21T19:30:00.000Z');
    expect(delta).toBeLessThanOrEqual(60_000);
    expect(delta).toBeGreaterThan(0);
  });

  it('se raccourcit quand une bascule d\'etat arrive avant', () => {
    // Trente secondes avant l'ouverture de salle : la validite du droit ne peut
    // pas depasser cette bascule.
    const verdict = decideWatch(
      base({ holdsSeat: true, runState: RunState.IDLE, publicationState: PublicationState.SCHEDULED, now: '2026-09-21T18:29:40.000Z' }),
    );
    expect(verdict.validUntil).toBe('2026-09-21T18:30:00.000Z');
  });
});

describe('les deux constantes derivees de la formule', () => {
  it('donne deux ecrans a `multi-screen`, un seul sinon', () => {
    expect(concurrentStreamsAllowedFor([PlanOpening.MULTI_SCREEN])).toBe(2);
    expect(concurrentStreamsAllowedFor([PlanOpening.REPLAYS])).toBe(1);
    expect(concurrentStreamsAllowedFor([])).toBe(1);
  });

  it('borne le budget d\'apercu a zero, jamais en dessous', () => {
    expect(previewSecondsLeft(0)).toBe(300);
    expect(previewSecondsLeft(48)).toBe(252);
    expect(previewSecondsLeft(9_999)).toBe(0);
  });
});
