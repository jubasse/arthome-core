/**
 * Le formatage du temps, sans `Intl` — noms de jours et de mois en dur dans
 * les deux langues, comme `helpers.js` les portait.
 *
 * ⚠ Toutes ces fonctions prennent un DECALAGE en argument. Aucune ne lit
 * l'heure de la machine ni ne devine un fuseau : c'est le serveur qui sert le
 * decalage, recalcule pour l'instant concerne (D3).
 */

import { toEpochMs, type Instant } from '../time/instant.js';
import { wallClockAt } from '../time/venue-clock.js';
// `Locale` est a la fois un type et un objet de membres nommes : un seul import
// porte les deux sens du nom.
import { Locale } from './locale.js';

const DAY_NAMES: Readonly<Record<Locale, readonly string[]>> = {
  fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

const MONTH_NAMES: Readonly<Record<Locale, readonly string[]>> = {
  fr: [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
  ],
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
};

const NARROW_NO_BREAK_SPACE = ' ';

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

/** « 21 h 04 » en francais, « 9:04 PM » en anglais. */
export function formatClock(instant: Instant, utcOffsetMinutes: number, locale: Locale): string {
  const wall = wallClockAt(instant, utcOffsetMinutes);
  if (locale === Locale.FR) {
    return `${String(wall.hour)}${NARROW_NO_BREAK_SPACE}h${NARROW_NO_BREAK_SPACE}${twoDigits(wall.minute)}`;
  }
  const suffix = wall.hour < 12 ? 'AM' : 'PM';
  const hour12 = wall.hour % 12 === 0 ? 12 : wall.hour % 12;
  return `${String(hour12)}:${twoDigits(wall.minute)} ${suffix}`;
}

/** « samedi 12 octobre » — sans formule relative. */
export function formatLongDate(instant: Instant, utcOffsetMinutes: number, locale: Locale): string {
  const wall = wallClockAt(instant, utcOffsetMinutes);
  const weekday = new Date(toEpochMs(instant) + utcOffsetMinutes * 60_000).getUTCDay();
  const dayName = DAY_NAMES[locale][weekday] ?? '';
  const monthName = MONTH_NAMES[locale][wall.month - 1] ?? '';
  return locale === Locale.FR
    ? `${dayName} ${String(wall.day)} ${monthName}`
    : `${dayName} ${monthName} ${String(wall.day)}`;
}

/**
 * « 2 h 30 » / « 2h 30m » — la duree d'un spectacle.
 *
 * Distincte de `formatCountdown` : une duree ne se compte pas, elle se declare.
 */
export function formatDuration(minutes: number, locale: Locale): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (locale === Locale.FR) {
    if (hours === 0) return `${String(rest)} min`;
    return rest === 0
      ? `${String(hours)}${NARROW_NO_BREAK_SPACE}h`
      : `${String(hours)}${NARROW_NO_BREAK_SPACE}h${NARROW_NO_BREAK_SPACE}${twoDigits(rest)}`;
  }
  if (hours === 0) return `${String(rest)}m`;
  return rest === 0 ? `${String(hours)}h` : `${String(hours)}h ${String(rest)}m`;
}

/**
 * « 42 min », « 2 h 10 », « 3 jours » — un decompte.
 *
 * ⚠ Il prend un NOMBRE DE MINUTES, jamais deux instants : le calcul de l'ecart
 * appartient a l'appelant, qui doit le faire contre l'INSTANT SERVEUR
 * (`servedAt`) et non contre l'horloge du telephone. L'horloge d'un mobile
 * derive en veille, saute au changement de fuseau, et l'utilisateur peut la
 * regler — un decompte calcule contre elle fait mentir tous les ecrans.
 */
export function formatCountdown(minutes: number, locale: Locale): string {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return locale === Locale.FR ? `${String(total)} min` : `${String(total)}m`;
  if (total < 1440) return formatDuration(total, locale);
  const days = Math.round(total / 1440);
  if (locale === Locale.FR) return `${String(days)} jour${days > 1 ? 's' : ''}`;
  return `${String(days)} day${days > 1 ? 's' : ''}`;
}

/** « 1:04:09 » — la position dans un media. Toujours la meme forme. */
export function formatTimecode(totalSeconds: number): string {
  const total = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0
    ? `${String(hours)}:${twoDigits(minutes)}:${twoDigits(seconds)}`
    : `${String(minutes)}:${twoDigits(seconds)}`;
}
