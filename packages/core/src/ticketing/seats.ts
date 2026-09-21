/**
 * La jauge, les paliers, et la RESERVATION qui empeche la jauge de mentir.
 */

import { DomainError } from '../kernel/errors.js';
import type { Instant } from '../kernel/clock.js';
import { isAfter, plusMinutes } from '../time/instant.js';

/**
 * L'etat de la jauge, en UNION DISCRIMINEE.
 *
 * `helpers.seatsLabel` rendait une PHRASE — « 86 places », « Complet »,
 * « Liste d'attente · 340 ». Une phrase ne se filtre pas, ne se trie pas, ne se
 * traduit pas, et fait fuir l'i18n. Le domaine rend un ETAT ; le libelle est
 * une cle resolue par la surface.
 */
export type SeatAvailability =
  | { readonly kind: 'seats-available'; readonly seatsAvailable: number }
  | { readonly kind: 'waitlist-only'; readonly waitlistCount: number }
  | { readonly kind: 'sold-out' };

export interface Gauge {
  readonly capacityTotal: number;
  readonly seatsSold: number;
  /** Places retenues par une intention d'achat en cours. Voir `SeatHold`. */
  readonly seatsHeld: number;
  readonly waitlistCount: number;
}

/**
 * Les places REELLEMENT disponibles : net des reservations en cours.
 *
 * Sans le retrait des `seatsHeld`, deux spectateurs achetent la derniere place.
 */
export function seatsAvailable(gauge: Gauge): number {
  return Math.max(0, gauge.capacityTotal - gauge.seatsSold - gauge.seatsHeld);
}

export function availabilityOf(gauge: Gauge): SeatAvailability {
  const available = seatsAvailable(gauge);
  if (available > 0) return { kind: 'seats-available', seatsAvailable: available };
  if (gauge.waitlistCount > 0) return { kind: 'waitlist-only', waitlistCount: gauge.waitlistCount };
  return { kind: 'sold-out' };
}

/**
 * Le TAUX de remplissage, en points de base — et non la capacite.
 *
 * `storefront-web` (forme 4) : « la surface a besoin du taux ; servir la
 * capacite et laisser calculer, c'est recreer la valeur composee a deux
 * endroits ». La maquette le prouve en appliquant une constante de 2000 places
 * independante de la salle — taux de remplissage et places restantes y sont
 * devenus deux valeurs independantes.
 */
export function fillRateBps(gauge: Gauge): number {
  if (gauge.capacityTotal <= 0) return 0;
  return Math.round((gauge.seatsSold / gauge.capacityTotal) * 10_000);
}

/**
 * « Bientot complet » — et le SEUIL est une regle du domaine, pas un litteral
 * d'interface.
 *
 * 8 500 points de base = 85 %, qui est aussi le seuil de la notification
 * « bientot complet ». Les deux DOIVENT etre le meme nombre : une carte qui dit
 * « bientot complet » et une alerte qui ne part pas seraient incomprehensibles.
 */
export const SCARCITY_THRESHOLD_BPS = 8_500;

export function isScarce(gauge: Gauge): boolean {
  return fillRateBps(gauge) >= SCARCITY_THRESHOLD_BPS && seatsAvailable(gauge) > 0;
}

/**
 * LA RESERVATION DE JAUGE, et son invariant d'INSTANT UNIQUE.
 *
 * Remontee par `auth` au temps 4, et elle engage `ticketing` : la duree d'un
 * appairage `seat` DOIT etre la duree d'un `hold` de places, sinon la jauge
 * affichee sur la TV est fausse pendant toute l'attente du telephone. Le cas
 * est concret : la TV montre « 12 places », le spectateur part chercher son
 * telephone, et pendant cinq minutes rien ne garantit qu'elles existent encore.
 *
 *   ⚠ `SeatHold.expiresAt` est le MEME INSTANT que l'expiration de l'intention
 *     d'achat qui l'a creee. Un seul instant, porte par deux objets, JAMAIS
 *     deux durees qui derivent.
 *
 * Et le hold est pose A L'OUVERTURE de l'intention, pas a son approbation :
 * c'est a l'instant ou la TV affiche le code que la jauge doit devenir vraie.
 */
export const HOLD_MINUTES_CHECKOUT = 15;
export const HOLD_MINUTES_TV_PAIRING = 5;

export interface SeatHold {
  readonly quantity: number;
  readonly expiresAt: Instant;
}

/**
 * Pose une reservation dont l'expiration EST celle de l'intention.
 *
 * La signature impose l'invariant : on ne passe pas une duree, on passe
 * l'instant d'expiration de l'intention. Il n'y a donc rien a synchroniser.
 */
export function holdFor(quantity: number, intentExpiresAt: Instant): SeatHold {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new DomainError({ code: 'hold.quantity_invalid', params: { quantity: String(quantity) } });
  }
  return { quantity, expiresAt: intentExpiresAt };
}

/** La duree d'intention pour un parcours de paiement direct. */
export function checkoutIntentExpiry(openedAt: Instant): Instant {
  return plusMinutes(openedAt, HOLD_MINUTES_CHECKOUT);
}

/** La duree d'intention pour un appairage TV — cinq minutes, pas quinze. */
export function tvPairingIntentExpiry(openedAt: Instant): Instant {
  return plusMinutes(openedAt, HOLD_MINUTES_TV_PAIRING);
}

export function isHoldExpired(hold: SeatHold, now: Instant): boolean {
  return !isAfter(hold.expiresAt, now);
}

/**
 * Les paliers de jauge : ils ELARGISSENT, jamais ne reduisent apres la mise en
 * vente.
 *
 * Une reduction apres mise en vente annulerait des places deja vendues. C'est
 * un invariant, pas une precaution.
 */
export function assertTierWidens(currentCapacity: number, nextCapacity: number): void {
  if (nextCapacity <= currentCapacity) {
    throw new DomainError({
      code: 'capacity.tier_must_widen',
      params: { current: String(currentCapacity), next: String(nextCapacity) },
    });
  }
}

/**
 * Le seuil de PROVISION TECHNIQUE et ses parametres — des DONNEES du contrat,
 * pas des constantes recopiees sur cinq surfaces.
 *
 * Au-dela de 10 000 spectateurs simultanes, l'infrastructure se provisionne a
 * l'avance ; un previsionnel tres au-dessus du reel expose a un malus ;
 * revisable jusqu'a 72 h avant.
 */
export const TECHNICAL_PROVISION_THRESHOLD = 10_000;
export const PROVISION_REVISION_HOURS = 72;

export function requiresTechnicalProvision(capacityTotal: number): boolean {
  return capacityTotal > TECHNICAL_PROVISION_THRESHOLD;
}

/**
 * La fenetre de priorite accordee a la liste d'attente quand un palier s'ouvre.
 *
 * ⚠ Ouvrir un palier PREVIENT LA LISTE DANS LE MEME GESTE : c'est UNE commande
 * transactionnelle, pas deux. Deux appels laisseraient la rarete se dissiper
 * entre eux — le temps que la liste soit prevenue, le public aurait pris les
 * places.
 */
export const WAITLIST_PRIORITY_HOURS = 2;
