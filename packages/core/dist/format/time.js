/**
 * Formatting time, without `Intl` — day and month names hard-coded in both
 * languages, as `helpers.js` carried them.
 *
 * ⚠ Every one of these functions takes an OFFSET as an argument. None reads the
 * machine's clock or guesses a time zone: the server serves the offset,
 * recomputed for the instant concerned (D3).
 */
import { Locale } from './locale.js';
import { toEpochMs } from '../time/instant.js';
import { wallClockAt } from '../time/venue-clock.js';
// `Locale` is both a type and an object of named members: one import carries
// both meanings of the name.
const DAY_NAMES = {
    fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};
const MONTH_NAMES = {
    fr: [
        'janvier',
        'février',
        'mars',
        'avril',
        'mai',
        'juin',
        'juillet',
        'août',
        'septembre',
        'octobre',
        'novembre',
        'décembre',
    ],
    en: [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
    ],
};
const NARROW_NO_BREAK_SPACE = ' ';
function twoDigits(value) {
    return String(value).padStart(2, '0');
}
/** "21 h 04" in French, "9:04 PM" in English. */
export function formatClock(instant, utcOffsetMinutes, locale) {
    const wall = wallClockAt(instant, utcOffsetMinutes);
    if (locale === Locale.FR) {
        return `${String(wall.hour)}${NARROW_NO_BREAK_SPACE}h${NARROW_NO_BREAK_SPACE}${twoDigits(wall.minute)}`;
    }
    const suffix = wall.hour < 12 ? 'AM' : 'PM';
    const hour12 = wall.hour % 12 === 0 ? 12 : wall.hour % 12;
    return `${String(hour12)}:${twoDigits(wall.minute)} ${suffix}`;
}
/** "samedi 12 octobre" — with no relative phrasing. */
export function formatLongDate(instant, utcOffsetMinutes, locale) {
    const wall = wallClockAt(instant, utcOffsetMinutes);
    const weekday = new Date(toEpochMs(instant) + utcOffsetMinutes * 60_000).getUTCDay();
    const dayName = DAY_NAMES[locale][weekday] ?? '';
    const monthName = MONTH_NAMES[locale][wall.month - 1] ?? '';
    return locale === Locale.FR
        ? `${dayName} ${String(wall.day)} ${monthName}`
        : `${dayName} ${monthName} ${String(wall.day)}`;
}
/**
 * "2 h 30" / "2h 30m" — a show's running time.
 *
 * Distinct from `formatCountdown`: a duration is not counted down, it is
 * declared.
 */
export function formatDuration(minutes, locale) {
    const total = Math.max(0, Math.round(minutes));
    const hours = Math.floor(total / 60);
    const rest = total % 60;
    if (locale === Locale.FR) {
        if (hours === 0)
            return `${String(rest)} min`;
        return rest === 0
            ? `${String(hours)}${NARROW_NO_BREAK_SPACE}h`
            : `${String(hours)}${NARROW_NO_BREAK_SPACE}h${NARROW_NO_BREAK_SPACE}${twoDigits(rest)}`;
    }
    if (hours === 0)
        return `${String(rest)}m`;
    return rest === 0 ? `${String(hours)}h` : `${String(hours)}h ${String(rest)}m`;
}
/**
 * "42 min", "2 h 10", "3 days" — a countdown.
 *
 * ⚠ It takes a NUMBER OF MINUTES, never two instants: computing the gap belongs
 * to the caller, who must do it against the SERVER INSTANT (`servedAt`) and not
 * against the phone's clock. A mobile clock drifts in sleep, jumps on a time
 * zone change, and the user can set it — a countdown computed against it makes
 * every screen lie.
 */
export function formatCountdown(minutes, locale) {
    const total = Math.max(0, Math.round(minutes));
    if (total < 60)
        return locale === Locale.FR ? `${String(total)} min` : `${String(total)}m`;
    if (total < 1440)
        return formatDuration(total, locale);
    const days = Math.round(total / 1440);
    if (locale === Locale.FR)
        return `${String(days)} jour${days > 1 ? 's' : ''}`;
    return `${String(days)} day${days > 1 ? 's' : ''}`;
}
/** "1:04:09" — the position in a media item. Always the same shape. */
export function formatTimecode(totalSeconds) {
    const total = Math.max(0, Math.round(totalSeconds));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return hours > 0
        ? `${String(hours)}:${twoDigits(minutes)}:${twoDigits(seconds)}`
        : `${String(minutes)}:${twoDigits(seconds)}`;
}
//# sourceMappingURL=time.js.map