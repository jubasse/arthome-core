/**
 * Instants, and the arithmetic we are allowed to do on them.
 *
 * D7 — `shared/catalogue.json` says it itself: "startOffsetMin, atMin and
 * rescheduledToOffsetMin are offsets from the moment the app is opened […]
 * NOTHING HERE EXPIRES". That is an excellent choice for a mockup: every state
 * exists at any hour, and all five surfaces see the same thing. It is unusable
 * in a contract.
 *
 * On the wire: ISO 8601 strings in UTC. In the database: `timestamptz`, in UTC.
 * And the zod decision imposes it by another route — `z.date()` cannot be
 * converted to JSON Schema.
 */
import { DomainError } from '../kernel/errors.js';
export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;
export function toEpochMs(instant) {
    const ms = Date.parse(instant);
    if (Number.isNaN(ms)) {
        throw new DomainError({ code: 'instant.invalid', params: { instant } });
    }
    return ms;
}
export function fromEpochMs(ms) {
    if (!Number.isFinite(ms)) {
        throw new DomainError({ code: 'instant.invalid', params: { instant: String(ms) } });
    }
    return new Date(ms).toISOString();
}
export function plusMinutes(instant, minutes) {
    return fromEpochMs(toEpochMs(instant) + minutes * MINUTE_MS);
}
export function plusHours(instant, hours) {
    return fromEpochMs(toEpochMs(instant) + hours * HOUR_MS);
}
export function minutesBetween(from, to) {
    return (toEpochMs(to) - toEpochMs(from)) / MINUTE_MS;
}
export function isBefore(left, right) {
    return toEpochMs(left) < toEpochMs(right);
}
export function isAfter(left, right) {
    return toEpochMs(left) > toEpochMs(right);
}
export function earliest(left, right) {
    return isBefore(left, right) ? left : right;
}
export function latest(left, right) {
    return isAfter(left, right) ? left : right;
}
export function windowOf(start, end) {
    if (!isBefore(start, end)) {
        throw new DomainError({ code: 'window.end_before_start', params: { start, end } });
    }
    return { start, end };
}
export function contains(window, instant) {
    const ms = toEpochMs(instant);
    return ms >= toEpochMs(window.start) && ms < toEpochMs(window.end);
}
/**
 * Do two windows overlap?
 *
 * This is the domain rule that detects the OVERLAPPING SHIFTS in the mobile
 * studio — "two streams to hold tonight". It must live here rather than on two
 * surfaces: `studio-mobile` asked for that explicitly.
 */
export function overlaps(left, right) {
    return isBefore(left.start, right.end) && isBefore(right.start, left.end);
}
//# sourceMappingURL=instant.js.map