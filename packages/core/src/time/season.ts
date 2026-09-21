/**
 * Les bornes d'une SAISON de spectacle vivant.
 *
 * `studio-web` Q12 : le selecteur de periode offre « saison » a cote de 7, 30
 * et 90 jours, et il refusait — a juste titre — de la coder dans le studio.
 * C'est une notion de domaine : servie, jamais devinee par cinq surfaces.
 *
 * Convention : 1er septembre -> 31 aout. C'est celle du spectacle vivant, et
 * elle n'est ecrite nulle part dans `shared/` — d'ou ce module.
 */

import { fromEpochMs, windowOf, type Instant, type Window } from './instant.js';

/** Le mois de bascule, en numerotation humaine : 9 = septembre. */
export const SEASON_START_MONTH = 9;

/**
 * La saison qui CONTIENT cet instant, exprimee dans le fuseau donne.
 *
 * Le fuseau compte : une date du 31 aout a 23 h 30 heure de salle peut etre du
 * 1er septembre en UTC, donc d'une autre saison. Le decalage est un argument,
 * comme partout ailleurs dans ce module.
 */
export function seasonBounds(instant: Instant, utcOffsetMinutes: number): Window {
  const shifted = new Date(Date.parse(instant) + utcOffsetMinutes * 60_000);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const startYear = month >= SEASON_START_MONTH ? year : year - 1;
  const offsetMs = utcOffsetMinutes * 60_000;
  const start = fromEpochMs(Date.UTC(startYear, SEASON_START_MONTH - 1, 1) - offsetMs);
  const end = fromEpochMs(Date.UTC(startYear + 1, SEASON_START_MONTH - 1, 1) - offsetMs);
  return windowOf(start, end);
}

/** Le libelle d'une saison, en CODE : « 2026-2027 ». Jamais une phrase. */
export function seasonLabel(instant: Instant, utcOffsetMinutes: number): string {
  const startYear = new Date(Date.parse(seasonBounds(instant, utcOffsetMinutes).start)).getUTCFullYear();
  return `${String(startYear)}-${String(startYear + 1)}`;
}
