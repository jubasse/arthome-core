/**
 * Les deux horloges — celle du spectateur et celle de la salle.
 *
 * D3 — `shared/catalogue.json` stocke `venue.utcOffsetMin`, un decalage FIGE,
 * et `helpers.js` en deduit l'abreviation d'ete ou d'hiver en le comparant a
 * une table. La REGLE est juste et se porte telle quelle : heure du spectateur
 * d'abord, heure de salle en second quand elle differe. La FORME ne survit pas :
 * un decalage fixe ne passe pas un changement d'heure, et une date programmee
 * dans six mois s'affiche a la mauvaise heure.
 *
 * E7 — et la maquette TV lit `fixtures.geography.viewerUtcOffsetMin`, qui
 * N'EXISTE NULLE PART : il vaut `undefined`, donc « l'heure a la salle » est en
 * realite calculee contre UTC. La surface n'avait aucune entree pour le fuseau
 * du spectateur.
 *
 * ⚠ Ce module NE CALCULE PAS un decalage a partir d'un identifiant IANA : la
 * base des fuseaux n'est pas embarquee, et l'embarquer couterait des centaines
 * de kilo-octets dans cinq applications. Le decalage est SERVI par le serveur,
 * recalcule pour l'instant concerne. Le calcul a donc lieu UNE FOIS.
 */

import { DomainError } from '../kernel/errors.js';
import { toEpochMs, type Instant, MINUTE_MS } from './instant.js';

/** Le fuseau d'une salle, servi a cote de l'instant UTC qu'il qualifie. */
export interface VenueClock {
  /** Identifiant IANA : « Europe/Paris ». Jamais une abreviation. */
  readonly timeZone: string;
  /** Le decalage CALCULE PAR LE SERVEUR pour l'instant qualifie, en minutes. */
  readonly utcOffsetMinutes: number;
}

const IANA_SHAPE = /^[A-Za-z]+(?:[_+-][A-Za-z0-9]+)*(?:\/[A-Za-z0-9]+(?:[_+-][A-Za-z0-9]+)*)+$/;

/**
 * Verifie la FORME, jamais l'existence : la base IANA n'est pas embarquee.
 * « Europe/Paris » passe, « CEST » et « +02:00 » sont refuses — ce sont
 * precisement les deux formes que D3 remplace.
 */
export function venueClock(timeZone: string, utcOffsetMinutes: number): VenueClock {
  if (!IANA_SHAPE.test(timeZone)) {
    throw new DomainError({ code: 'timezone.not_iana', params: { timeZone } });
  }
  if (!Number.isInteger(utcOffsetMinutes) || Math.abs(utcOffsetMinutes) > 16 * 60) {
    throw new DomainError({
      code: 'timezone.offset_out_of_range',
      params: { offset: String(utcOffsetMinutes) },
    });
  }
  return { timeZone, utcOffsetMinutes };
}

/**
 * Les deux horloges different-elles pour cet instant ?
 *
 * Le decalage du SPECTATEUR est un argument, jamais un global : c'est
 * exactement l'etat global que `helpers.js` portait, et deux requetes
 * concurrentes d'un service le partageraient.
 */
export function clocksDiffer(venue: VenueClock, viewerUtcOffsetMinutes: number): boolean {
  return venue.utcOffsetMinutes !== viewerUtcOffsetMinutes;
}

/**
 * Le decalage de JOUR entre les deux horloges : -1, 0 ou +1.
 *
 * Le studio affiche « la veille » ou « le lendemain » quand le passage d'une
 * horloge a l'autre change de jour. C'est faux avec un decalage fige, et c'est
 * le cas qui a fait echouer D3 : une date a 23 h 30 heure de salle peut etre le
 * lendemain chez le spectateur.
 */
export function dayShift(
  instant: Instant,
  venue: VenueClock,
  viewerUtcOffsetMinutes: number,
): -1 | 0 | 1 {
  const ms = toEpochMs(instant);
  const venueDay = Math.floor((ms + venue.utcOffsetMinutes * MINUTE_MS) / 86_400_000);
  const viewerDay = Math.floor((ms + viewerUtcOffsetMinutes * MINUTE_MS) / 86_400_000);
  const delta = venueDay - viewerDay;
  return delta > 0 ? 1 : delta < 0 ? -1 : 0;
}

/**
 * Les composantes murales d'un instant dans un fuseau donne.
 *
 * Rendues comme des NOMBRES, jamais comme une chaine : le formatage est de la
 * presentation et depend de la locale.
 */
export interface WallClock {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
}

export function wallClockAt(instant: Instant, utcOffsetMinutes: number): WallClock {
  const shifted = new Date(toEpochMs(instant) + utcOffsetMinutes * MINUTE_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}
