/**
 * Les SEUILS de notification — des regles de domaine, pas des textes d'ecran.
 *
 * `storefront-mobile` Q10 : les cinq seuils sont ecrits dans des libelles de
 * maquette. « Recopies, ils divergeront : le web dira 30 minutes, la TV 15, et
 * le mobile aura raison par hasard. »
 *
 * Deux d'entre eux n'avaient AUCUN porteur nulle part (G6) — le seuil de file
 * de moderation et le delai d'affectation d'un poste. Ils sont ici.
 */

import type { Instant } from '../kernel/clock.js';
import { minutesBetween, plusMinutes } from '../time/instant.js';
import { NotificationChannel } from '../vocabulary/people.js';

/** Un artiste suivi passe a l'antenne : des l'ouverture du flux. */
export const LIVE_START_LEAD_MINUTES = 0;
/** Rappel avant un direct pour lequel je detiens une place. */
export const REMINDER_LEAD_MINUTES = 30;
/** « Bientot complet » — LE MEME nombre que le seuil de rarete d'une carte. */
export const ALMOST_FULL_THRESHOLD_BPS = 8_500;
/** Fin de disponibilite d'une rediffusion. */
export const REPLAY_EXPIRY_WARNING_HOURS = 6;
/** File de moderation saturee — n'avait aucun porteur. */
export const MODERATION_QUEUE_ALERT_SIZE = 10;
/** Poste non affecte a J-1 — n'avait aucun porteur non plus. */
export const CREW_UNASSIGNED_ALERT_HOURS = 24;

export function reminderInstantFor(startsAt: Instant): Instant {
  return plusMinutes(startsAt, -REMINDER_LEAD_MINUTES);
}

/**
 * Les HEURES CALMES, et leur exception.
 *
 * 23 h -> 9 h, aucune notification — SAUF le debut d'un direct pour lequel la
 * personne detient une place. `storefront-web` le releve : « c'est une regle
 * metier du service de notification, pas un reglage d'interface ».
 *
 * ⚠ Le decalage est un ARGUMENT : les heures calmes sont celles du DORMEUR, pas
 * celles du serveur. C'est la meme discipline que partout dans ce paquet.
 */
export const QUIET_HOURS_START = 23;
export const QUIET_HOURS_END = 9;

export function isWithinQuietHours(instant: Instant, viewerUtcOffsetMinutes: number): boolean {
  const shifted = new Date(Date.parse(instant) + viewerUtcOffsetMinutes * 60_000);
  const hour = shifted.getUTCHours();
  return hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END;
}

export interface DeliveryDecision {
  readonly deliver: boolean;
  readonly reasonCode: string | null;
}

/**
 * Faut-il delivrer maintenant ?
 *
 * L'exception est etroite ET explicite : elle ne couvre que le debut d'un
 * direct dont la personne detient une place. Un rappel « nouvelle date
 * annoncee » a 3 h du matin reste refuse — c'est tout le sens des heures
 * calmes.
 */
export function shouldDeliverNow(
  instant: Instant,
  viewerUtcOffsetMinutes: number,
  isHeldSeatLiveStart: boolean,
): DeliveryDecision {
  if (!isWithinQuietHours(instant, viewerUtcOffsetMinutes)) {
    return { deliver: true, reasonCode: null };
  }
  if (isHeldSeatLiveStart) {
    return { deliver: true, reasonCode: 'notification.quiet_hours_exception_held_seat' };
  }
  return { deliver: false, reasonCode: 'notification.deferred_quiet_hours' };
}

/**
 * La REDACTION s'applique aussi a une notification.
 *
 * `studio-mobile` : « une notification ne porte jamais un montant si le role
 * destinataire n'a pas `canRevenue` ». L'argument est decisif — une
 * notification s'affiche sur un ECRAN VERROUILLE.
 */
export function mayCarryAmount(recipientCanRevenue: boolean): boolean {
  return recipientCanRevenue;
}

/**
 * Le TROISIEME canal est `in-app`, pas `sms` (D-017).
 *
 * La grille de preferences offre trois canaux par declencheur, deux seulement
 * sont nommes dans le dossier, et le champ telephone porte la mention « pour
 * les SMS de rappel ». Un canal SMS a un cout par message, une reglementation
 * propre — consentement, horaires, desinscription — et un prestataire de plus,
 * pour une valeur que rien n'a eprouvee.
 */
export const DEFAULT_CHANNELS: readonly NotificationChannel[] = [
  NotificationChannel.PUSH,
  NotificationChannel.IN_APP,
];

/**
 * Un rappel est une PROMESSE DATEE : il suit un report et s'annule avec une
 * annulation, jamais ne part a vide.
 */
export function reminderStillValid(
  scheduledFor: Instant,
  currentStartsAt: Instant | null,
): boolean {
  if (currentStartsAt === null) return false;
  return Math.abs(minutesBetween(reminderInstantFor(currentStartsAt), scheduledFor)) < 1;
}
