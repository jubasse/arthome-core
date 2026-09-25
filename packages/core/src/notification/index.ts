/**
 * The thresholds below are domain rules, not screen copy: copied into labels
 * they diverge — the web says 30 minutes, the TV 15, mobile is right by accident.
 */

import type { Instant } from '../kernel/clock.js';
import { minutesBetween, plusMinutes } from '../time/instant.js';
import { NotificationChannel } from '../vocabulary/people.js';

/** A followed artist goes on air: as soon as the feed opens. */
export const LIVE_START_LEAD_MINUTES = 0;
/** Reminder before a live show for which I hold a seat. */
export const REMINDER_LEAD_MINUTES = 30;
/** "Almost full" — the same number as a card's scarcity threshold. */
export const ALMOST_FULL_THRESHOLD_BPS = 8_500;
/** End of a replay's availability. */
export const REPLAY_EXPIRY_WARNING_HOURS = 6;
/** Moderation queue saturated. */
export const MODERATION_QUEUE_ALERT_SIZE = 10;
/** Crew post unassigned at D-1. */
export const CREW_UNASSIGNED_ALERT_HOURS = 24;

export function reminderInstantFor(startsAt: Instant): Instant {
  return plusMinutes(startsAt, -REMINDER_LEAD_MINUTES);
}

/** Quiet hours, 23:00 -> 09:00, in the sleeper's own offset and never the server's. */
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

/** Whether to deliver now — the quiet-hours exception covers a held seat's live start only. */
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

/** Redaction reaches a notification too: it appears on a locked screen. */
export function mayCarryAmount(recipientCanRevenue: boolean): boolean {
  return recipientCanRevenue;
}

/** The channels every trigger offers by default — the third is in-app, not sms (D-017). */
export const DEFAULT_CHANNELS: readonly NotificationChannel[] = [
  NotificationChannel.PUSH,
  NotificationChannel.IN_APP,
];

/** Whether a scheduled reminder still matches the date it was placed for. */
export function reminderStillValid(
  scheduledFor: Instant,
  currentStartsAt: Instant | null,
): boolean {
  if (currentStartsAt === null) return false;
  return Math.abs(minutesBetween(reminderInstantFor(currentStartsAt), scheduledFor)) < 1;
}
