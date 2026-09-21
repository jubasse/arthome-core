/**
 * `decideWatch` — LA VALEUR LA PLUS DANGEREUSE DU SYSTEME.
 *
 * Cinq sources : possession d'une place, etat de la date, droits territoriaux,
 * politique de rediffusion, formule d'abonnement. Affichee sur CHAQUE CARTE de
 * CHAQUE SURFACE. Candidate numero un au « calcule deux fois ».
 *
 * ⚠ CE QUI NE SE PORTE PAS. `helpers.isWatchable(account, date)` suppose que le
 * client DETIENT LA LISTE COMPLETE DES PLACES DU COMPTE. `storefront-mobile`
 * l'a demontre intenable : elle grandit, elle change pendant que l'application
 * dort, et la decision territoriale n'appartient pas au client.
 *
 * ⚠ UNE IMPLEMENTATION, DEUX SITES D'EVALUATION, UNE SEULE AUTORITE :
 *   - au BFF, pour peindre une carte sans second aller-retour. Le verdict y est
 *     INDICATIF ET NON OPPOSABLE, et le contrat le declare tel ;
 *   - dans `streaming`, a l'ouverture du lecteur. **Seule evaluation qui fait
 *     autorite**, parce que seule a produire un jeton.
 *
 * Et le meme vocabulaire de refus des deux cotes : une carte qui annonce
 * « abonnement requis » et un lecteur qui refuse pour la meme raison disent le
 * MEME code.
 */

import type { Instant } from '../kernel/clock.js';
import { earliest } from '../time/instant.js';
import { DateOutcome, DisplayState, ReplayPolicy } from '../vocabulary/catalog.js';
import { PlanOpening } from '../vocabulary/commerce.js';
import type { DateTiming } from '../catalog/date-state.js';
import { displayStateOf } from '../catalog/date-state.js';
import { isAvailableIn, type TerritoryRights } from '../catalog/rights.js';
import type { PublicationState, RunState } from '../vocabulary/catalog.js';

/**
 * Les motifs de refus — un CODE par ecran different.
 *
 * `storefront-tv` les liste un par un : chacun produit un ecran different, et
 * un code generique en produirait un faux. « Aucune rediffusion pour cette
 * date » et « rediffusion expiree » sont deux choses ; « complet » et « liste
 * d'attente » aussi.
 */
export const WATCH_DENIAL_REASONS = [
  'no-seat',
  'room-not-open',
  'out-of-territory',
  'subscription-required',
  'no-replay',
  'replay-expired',
  'replay-not-on-sale',
  'preview-exhausted',
  'concurrent-limit-reached',
  'date-cancelled',
  'not-published',
] as const;
export type WatchDenialReason = (typeof WATCH_DENIAL_REASONS)[number];

export const WatchDenialReason = {
  NO_SEAT: 'no-seat',
  ROOM_NOT_OPEN: 'room-not-open',
  OUT_OF_TERRITORY: 'out-of-territory',
  SUBSCRIPTION_REQUIRED: 'subscription-required',
  NO_REPLAY: 'no-replay',
  REPLAY_EXPIRED: 'replay-expired',
  REPLAY_NOT_ON_SALE: 'replay-not-on-sale',
  PREVIEW_EXHAUSTED: 'preview-exhausted',
  CONCURRENT_LIMIT_REACHED: 'concurrent-limit-reached',
  DATE_CANCELLED: 'date-cancelled',
  NOT_PUBLISHED: 'not-published',
} as const satisfies Record<string, WatchDenialReason>;

/** L'action qui SORT DE L'IMPASSE — un etat vide sans issue est proscrit. */
export const WATCH_FALLBACK_ACTIONS = ['buy-seat', 'subscribe', 'see-other-dates', 'release-a-screen', 'none-action'] as const;
export type WatchFallbackAction = (typeof WATCH_FALLBACK_ACTIONS)[number];

export const WatchFallbackAction = {
  BUY_SEAT: 'buy-seat',
  SUBSCRIBE: 'subscribe',
  SEE_OTHER_DATES: 'see-other-dates',
  RELEASE_A_SCREEN: 'release-a-screen',
  NONE: 'none-action',
} as const satisfies Record<string, WatchFallbackAction>;

/** Les CINQ entrees, nommees. Aucune n'est devinee, aucune n'est globale. */
export interface WatchInput {
  readonly holdsSeat: boolean;
  readonly planOpenings: readonly PlanOpening[];
  readonly concurrentStreamsOpen: number;
  readonly concurrentStreamsAllowed: number;
  readonly previewSecondsLeft: number;
  readonly viewerCountry: string;
  readonly rights: TerritoryRights;
  readonly timing: DateTiming;
  readonly publicationState: PublicationState;
  readonly runState: RunState | null;
  readonly outcome: DateOutcome | null;
  readonly replayOnSale: boolean;
  readonly now: Instant;
}

export interface WatchVerdict {
  readonly allowed: boolean;
  /** `preview` quand l'acces est un apercu gratuit borne. */
  readonly scope: 'full' | 'preview' | 'none';
  readonly reason: WatchDenialReason | null;
  readonly fallback: WatchFallbackAction;
  readonly previewSecondsLeft: number;
  /**
   * ⚠ NE DEPASSE JAMAIS 60 SECONDES, et le droit ne se met JAMAIS en cache sur
   * disque : il expire, il depend du territoire, il depend de la limite
   * d'ecrans. Un droit relu depuis le disque est un droit FAUX.
   */
  readonly validUntil: Instant;
}

const VERDICT_MAX_VALIDITY_MS = 60_000;

function denied(
  reason: WatchDenialReason,
  fallback: WatchFallbackAction,
  previewSecondsLeft: number,
  validUntil: Instant,
): WatchVerdict {
  return { allowed: false, scope: 'none', reason, fallback, previewSecondsLeft, validUntil };
}

/**
 * L'ordre des refus est une DECISION, pas une commodite.
 *
 * Il va du plus definitif au plus rattrapable, pour que le message affiche soit
 * le plus utile : dire « hors territoire » a quelqu'un qui n'a pas de place est
 * plus juste que « pas de place », puisque acheter une place ne le
 * debloquerait pas. `storefront-web` Q19 le demandait sans le formuler ainsi —
 * c'est le test de la table de verite qui l'a fait apparaitre.
 */
export function decideWatch(input: WatchInput): WatchVerdict {
  const horizon = shortHorizon(input.now);
  const preview = Math.max(0, input.previewSecondsLeft);

  // 1. Le territoire — definitif, et il ne s'achete pas.
  if (!isAvailableIn(input.rights, input.viewerCountry)) {
    return denied(WatchDenialReason.OUT_OF_TERRITORY, WatchFallbackAction.SEE_OTHER_DATES, preview, horizon);
  }

  // 2. L'issue — une date annulee ne se regarde pas, meme avec une place.
  if (input.outcome === DateOutcome.CANCELLED) {
    return denied(WatchDenialReason.DATE_CANCELLED, WatchFallbackAction.SEE_OTHER_DATES, preview, horizon);
  }

  const display = displayStateOf({
    publicationState: input.publicationState,
    runState: input.runState,
    outcome: input.outcome,
    timing: input.timing,
    now: input.now,
  });

  // 3. Ce qui n'est pas public ne se regarde pas.
  if (
    display.state === DisplayState.DRAFT ||
    display.state === DisplayState.RESERVE ||
    display.state === DisplayState.TECHNICAL
  ) {
    return denied(WatchDenialReason.NOT_PUBLISHED, WatchFallbackAction.NONE, preview, horizon);
  }

  // 4. La limite d'ecrans — elle se rattrape en liberant un ecran, d'ou
  //    l'action de repli. Un refus nu laisserait le spectateur sans issue.
  if (input.concurrentStreamsOpen >= input.concurrentStreamsAllowed) {
    return denied(
      WatchDenialReason.CONCURRENT_LIMIT_REACHED,
      WatchFallbackAction.RELEASE_A_SCREEN,
      preview,
      horizon,
    );
  }

  const validUntil = earliest(horizon, display.validUntil ?? horizon);

  // 5. La rediffusion — trois refus distincts, que la TV exige de distinguer.
  if (display.state === DisplayState.REPLAY) {
    return decideReplay(input, preview, validUntil);
  }

  // 6. Le direct — une place detenue ouvre le spectacle (principe n°3).
  if (display.state === DisplayState.LIVE || display.state === DisplayState.ROOM_OPEN) {
    if (input.holdsSeat) {
      return { allowed: true, scope: 'full', reason: null, fallback: WatchFallbackAction.NONE, previewSecondsLeft: preview, validUntil };
    }
    if (input.planOpenings.includes(PlanOpening.ALL_LIVES)) {
      return { allowed: true, scope: 'full', reason: null, fallback: WatchFallbackAction.NONE, previewSecondsLeft: preview, validUntil };
    }
    // L'apercu gratuit : borne, decompte par le SERVEUR, et jamais renouvelable
    // en rechargeant la page.
    if (preview > 0) {
      return { allowed: true, scope: 'preview', reason: null, fallback: WatchFallbackAction.BUY_SEAT, previewSecondsLeft: preview, validUntil };
    }
    return denied(WatchDenialReason.PREVIEW_EXHAUSTED, WatchFallbackAction.BUY_SEAT, preview, validUntil);
  }

  // 7. Avant l'ouverture de salle, une place ne suffit pas encore.
  if (display.state === DisplayState.SCHEDULED) {
    return denied(WatchDenialReason.ROOM_NOT_OPEN, input.holdsSeat ? WatchFallbackAction.NONE : WatchFallbackAction.BUY_SEAT, preview, validUntil);
  }

  // 8. Terminee, sans rediffusion en ligne.
  return denied(
    input.timing.replayPolicy === ReplayPolicy.NONE
      ? WatchDenialReason.NO_REPLAY
      : WatchDenialReason.REPLAY_EXPIRED,
    WatchFallbackAction.SEE_OTHER_DATES,
    preview,
    validUntil,
  );
}

function decideReplay(input: WatchInput, preview: number, validUntil: Instant): WatchVerdict {
  const allow = (): WatchVerdict => ({
    allowed: true,
    scope: 'full',
    reason: null,
    fallback: WatchFallbackAction.NONE,
    previewSecondsLeft: preview,
    validUntil,
  });

  switch (input.timing.replayPolicy) {
    case ReplayPolicy.INCLUDED:
      // Incluse : une place detenue l'ouvre. Sans place, il faut l'acheter.
      return input.holdsSeat
        ? allow()
        : denied(WatchDenialReason.NO_SEAT, WatchFallbackAction.BUY_SEAT, preview, validUntil);
    case ReplayPolicy.SUBSCRIPTION:
      return input.planOpenings.includes(PlanOpening.REPLAYS)
        ? allow()
        : denied(WatchDenialReason.SUBSCRIPTION_REQUIRED, WatchFallbackAction.SUBSCRIBE, preview, validUntil);
    case ReplayPolicy.UNIT:
      if (input.holdsSeat) return allow();
      return input.replayOnSale
        ? denied(WatchDenialReason.NO_SEAT, WatchFallbackAction.BUY_SEAT, preview, validUntil)
        : denied(WatchDenialReason.REPLAY_NOT_ON_SALE, WatchFallbackAction.SEE_OTHER_DATES, preview, validUntil);
    case ReplayPolicy.NONE:
      return denied(WatchDenialReason.NO_REPLAY, WatchFallbackAction.SEE_OTHER_DATES, preview, validUntil);
  }
}

function shortHorizon(now: Instant): Instant {
  return new Date(Date.parse(now) + VERDICT_MAX_VALIDITY_MS).toISOString();
}

/**
 * Le plafond d'ecrans simultanes, derive de la formule.
 *
 * `multi-screen` n'est pas une ligne de marketing : c'est une CONTRAINTE
 * D'EXECUTION qui impose un decompte serveur. `ticketing` publie le plafond ;
 * `streaming` le fait respecter par un bail qui expire.
 */
export function concurrentStreamsAllowedFor(planOpenings: readonly PlanOpening[]): number {
  return planOpenings.includes(PlanOpening.MULTI_SCREEN) ? 2 : 1;
}

/**
 * Le budget d'apercu gratuit — DECOMPTE PAR LE SERVEUR, par COMPTE.
 *
 * `storefront-web` Q20 : « un apercu que l'on prolonge en rechargeant la page
 * n'est pas un apercu ». `storefront-mobile` Q6 ajoute qu'une reinstallation
 * remettrait un compteur client a zero.
 *
 * Par COMPTE et non par appareil : sinon un foyer a quatre appareils obtient
 * quatre apercus.
 */
export const PREVIEW_BUDGET_SECONDS = 300;

export function previewSecondsLeft(secondsUsed: number): number {
  return Math.max(0, PREVIEW_BUDGET_SECONDS - Math.max(0, secondsUsed));
}
