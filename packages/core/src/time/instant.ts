/**
 * Les instants, et l'arithmetique qu'on a le droit de faire dessus.
 *
 * D7 — `shared/catalogue.json` le dit lui-meme : « startOffsetMin, atMin and
 * rescheduledToOffsetMin are offsets from the moment the app is opened […]
 * NOTHING HERE EXPIRES ». C'est un choix excellent pour une maquette : tous les
 * etats existent a toute heure, et les cinq surfaces voient la meme chose.
 * C'est inutilisable sur un contrat.
 *
 * Sur le fil : des chaines ISO 8601 en UTC. En base : `timestamptz`, en UTC.
 * Et la decision zod l'impose par un autre chemin — `z.date()` est
 * inconvertible en JSON Schema.
 */

import { DomainError } from '../kernel/errors.js';
import type { Instant } from '../kernel/clock.js';

export type { Instant };

export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

export function toEpochMs(instant: Instant): number {
  const ms = Date.parse(instant);
  if (Number.isNaN(ms)) {
    throw new DomainError({ code: 'instant.invalid', params: { instant } });
  }
  return ms;
}

export function fromEpochMs(ms: number): Instant {
  if (!Number.isFinite(ms)) {
    throw new DomainError({ code: 'instant.invalid', params: { instant: String(ms) } });
  }
  return new Date(ms).toISOString();
}

export function plusMinutes(instant: Instant, minutes: number): Instant {
  return fromEpochMs(toEpochMs(instant) + minutes * MINUTE_MS);
}

export function plusHours(instant: Instant, hours: number): Instant {
  return fromEpochMs(toEpochMs(instant) + hours * HOUR_MS);
}

export function minutesBetween(from: Instant, to: Instant): number {
  return (toEpochMs(to) - toEpochMs(from)) / MINUTE_MS;
}

export function isBefore(left: Instant, right: Instant): boolean {
  return toEpochMs(left) < toEpochMs(right);
}

export function isAfter(left: Instant, right: Instant): boolean {
  return toEpochMs(left) > toEpochMs(right);
}

export function earliest(left: Instant, right: Instant): Instant {
  return isBefore(left, right) ? left : right;
}

export function latest(left: Instant, right: Instant): Instant {
  return isAfter(left, right) ? left : right;
}

/** Une fenetre fermee a gauche, ouverte a droite : `[start, end)`. */
export interface Window {
  readonly start: Instant;
  readonly end: Instant;
}

export function windowOf(start: Instant, end: Instant): Window {
  if (!isBefore(start, end)) {
    throw new DomainError({ code: 'window.end_before_start', params: { start, end } });
  }
  return { start, end };
}

export function contains(window: Window, instant: Instant): boolean {
  const ms = toEpochMs(instant);
  return ms >= toEpochMs(window.start) && ms < toEpochMs(window.end);
}

/**
 * Deux fenetres se chevauchent-elles ?
 *
 * C'est la regle de domaine qui detecte les GARDES QUI SE RECOUVRENT du studio
 * mobile — « deux flux a tenir ce soir ». Elle doit vivre ici et non sur deux
 * surfaces : `studio-mobile` le demandait explicitement.
 */
export function overlaps(left: Window, right: Window): boolean {
  return isBefore(left.start, right.end) && isBefore(right.start, left.end);
}
