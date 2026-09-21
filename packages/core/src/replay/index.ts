/**
 * La rediffusion : la PROMESSE, la fenetre, et ce qu'il en reste.
 *
 * Le decoupage entre ce module et `catalog/date-state` n'est pas arbitraire, il
 * suit la carte des contextes :
 *   - la POLITIQUE et la FENETRE sont a `catalog` — c'est la promesse faite
 *     AVANT L'ACHAT, et le dossier en fait un principe : c'est elle qui
 *     justifie l'ecart de tarif ;
 *   - la MISE EN VENTE est a `ticketing` — le prix quand la politique est
 *     `unit` ;
 *   - le FICHIER et son expiration sont a `streaming`.
 *
 * Ce module porte ce que le SPECTATEUR en voit : combien de temps il lui reste,
 * et s'il peut regarder.
 */

import type { Instant } from '../kernel/clock.js';
import { minutesBetween } from '../time/instant.js';
import { ReplayPolicy } from '../vocabulary/catalog.js';
import { replayEndsAt, type DateTiming } from '../catalog/date-state.js';

/**
 * Les heures restantes de rediffusion — une valeur DECROISSANTE.
 *
 * ⚠ C'est l'exemple canonique de la regle « aucune valeur calculee deux
 * fois », et `storefront-tv` l'a formule mieux que moi :
 *
 *   « Les heures restantes se DERIVENT de l'instant de fin et de la fenetre,
 *     donc le contrat livre les deux entrees, pas le resultat. Si le serveur
 *     livrait le nombre d'heures, il serait faux des la minute suivante. »
 *
 * D'ou la forme : la fonction prend un `now` EXPLICITE. Le serveur l'appelle
 * avec son instant et sert le resultat AVEC ses entrees ; la surface la
 * rappelle avec l'instant serveur corrige de son decalage. Une regle, deux
 * appels, aucune reimplementation.
 */
export function replayHoursLeft(timing: DateTiming, now: Instant): number {
  const endsAtInstant = replayEndsAt(timing);
  if (endsAtInstant === null) return 0;
  const minutes = minutesBetween(now, endsAtInstant);
  return minutes <= 0 ? 0 : Math.ceil(minutes / 60);
}

/**
 * La rediffusion est-elle ENCORE en ligne ?
 *
 * Distincte de « existe-t-il une rediffusion » : une date peut avoir une
 * politique `included` et une fenetre expiree. `storefront-tv` exige que les
 * deux refus soient distinguables — « aucune rediffusion pour cette date » et
 * « rediffusion expiree » sont deux ecrans differents.
 */
export function isReplayWindowOpen(timing: DateTiming, now: Instant): boolean {
  return replayHoursLeft(timing, now) > 0;
}

/** La date promet-elle une rediffusion, quelle que soit la fenetre ? */
export function hasReplayPolicy(timing: DateTiming): boolean {
  return timing.replayPolicy !== ReplayPolicy.NONE;
}

/**
 * La rediffusion se paie-t-elle a l'unite ?
 *
 * `unit` est la seule politique qui demande un prix a `ticketing`. `included`
 * et `subscription` ouvrent sur un droit deja detenu.
 */
export function isReplaySoldSeparately(timing: DateTiming): boolean {
  return timing.replayPolicy === ReplayPolicy.UNIT;
}

/** Pourquoi la rediffusion n'est pas regardable — en CODE. */
export const REPLAY_UNAVAILABILITY_REASONS = ['no-replay-policy', 'replay-window-expired'] as const;
export type ReplayUnavailabilityReason = (typeof REPLAY_UNAVAILABILITY_REASONS)[number];

export const ReplayUnavailabilityReason = {
  NO_POLICY: 'no-replay-policy',
  WINDOW_EXPIRED: 'replay-window-expired',
} as const satisfies Record<string, ReplayUnavailabilityReason>;

/**
 * Le diagnostic complet, en une passe.
 *
 * Rend `null` quand la rediffusion est disponible — l'absence de motif EST la
 * disponibilite, ce qui evite un second appel pour savoir pourquoi.
 */
export function replayUnavailabilityReason(
  timing: DateTiming,
  now: Instant,
): ReplayUnavailabilityReason | null {
  if (!hasReplayPolicy(timing)) return ReplayUnavailabilityReason.NO_POLICY;
  if (!isReplayWindowOpen(timing, now)) return ReplayUnavailabilityReason.WINDOW_EXPIRED;
  return null;
}
