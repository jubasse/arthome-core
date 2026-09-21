/**
 * The notification THRESHOLDS — domain rules, not screen copy.
 *
 * `storefront-mobile` Q10: the five thresholds are written into mockup labels.
 * "Copied, they will diverge: the web will say 30 minutes, the TV 15, and
 * mobile will be right by accident."
 *
 * Two of them had NO owner anywhere (G6) — the moderation-queue threshold and
 * the crew-assignment deadline. They are here.
 */

import type { Instant } from '../kernel/clock.js';
import { minutesBetween, plusMinutes } from '../time/instant.js';
import { NotificationChannel } from '../vocabulary/people.js';

/** A followed artist goes on air: as soon as the feed opens. */
export const LIVE_START_LEAD_MINUTES = 0;
/** Reminder before a live show for which I hold a seat. */
export const REMINDER_LEAD_MINUTES = 30;
/** "Almost full" — THE SAME number as a card's scarcity threshold. */
export const ALMOST_FULL_THRESHOLD_BPS = 8_500;
/** End of a replay's availability. */
export const REPLAY_EXPIRY_WARNING_HOURS = 6;
/** Moderation queue saturated — had no owner anywhere. */
export const MODERATION_QUEUE_ALERT_SIZE = 10;
/** Crew post unassigned at D-1 — had no owner either. */
export const CREW_UNASSIGNED_ALERT_HOURS = 24;

export function reminderInstantFor(startsAt: Instant): Instant {
  return plusMinutes(startsAt, -REMINDER_LEAD_MINUTES);
}

/**
 * QUIET HOURS, and their exception.
 *
 * 23:00 -> 09:00, no notification — EXCEPT the start of a live show for which
 * the person holds a seat. `storefront-web` points it out: "that is a business
 * rule of the notification service, not an interface setting".
 *
 * ⚠ The offset is an ARGUMENT: quiet hours are the SLEEPER's, not the server's.
 * The same discipline as everywhere in this package.
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
 * Should it be delivered now?
 *
 * The exception is narrow AND explicit: it covers only the start of a live show
 * for which the person holds a seat. A "new date announced" reminder at 3 a.m.
 * stays refused — that is the whole point of quiet hours.
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
 * REDACTION applies to a notification too.
 *
 * `studio-mobile`: "a notification never carries an amount if the recipient's
 * role does not have `canRevenue`". The argument is decisive — a notification
 * appears on a LOCKED SCREEN.
 */
export function mayCarryAmount(recipientCanRevenue: boolean): boolean {
  return recipientCanRevenue;
}

/**
 * The THIRD channel is `in-app`, not `sms` (D-017).
 *
 * The preferences grid offers three channels per trigger, only two are named in
 * the file, and the phone field carries the note "for reminder SMS". An SMS
 * channel has a per-message cost, a regulation of its own — consent, hours,
 * opt-out — and one more provider, for a value nothing has tested.
 */
export const DEFAULT_CHANNELS: readonly NotificationChannel[] = [
  NotificationChannel.PUSH,
  NotificationChannel.IN_APP,
];

/**
 * A reminder is a DATED PROMISE: it follows a postponement and is cancelled
 * with a cancellation; it never fires into the void.
 */
export function reminderStillValid(
  scheduledFor: Instant,
  currentStartsAt: Instant | null,
): boolean {
  if (currentStartsAt === null) return false;
  return Math.abs(minutesBetween(reminderInstantFor(currentStartsAt), scheduledFor)) < 1;
}
