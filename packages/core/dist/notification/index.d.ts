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
import { NotificationChannel } from '../vocabulary/people.js';
/** A followed artist goes on air: as soon as the feed opens. */
export declare const LIVE_START_LEAD_MINUTES = 0;
/** Reminder before a live show for which I hold a seat. */
export declare const REMINDER_LEAD_MINUTES = 30;
/** "Almost full" — THE SAME number as a card's scarcity threshold. */
export declare const ALMOST_FULL_THRESHOLD_BPS = 8500;
/** End of a replay's availability. */
export declare const REPLAY_EXPIRY_WARNING_HOURS = 6;
/** Moderation queue saturated — had no owner anywhere. */
export declare const MODERATION_QUEUE_ALERT_SIZE = 10;
/** Crew post unassigned at D-1 — had no owner either. */
export declare const CREW_UNASSIGNED_ALERT_HOURS = 24;
export declare function reminderInstantFor(startsAt: Instant): Instant;
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
export declare const QUIET_HOURS_START = 23;
export declare const QUIET_HOURS_END = 9;
export declare function isWithinQuietHours(instant: Instant, viewerUtcOffsetMinutes: number): boolean;
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
export declare function shouldDeliverNow(instant: Instant, viewerUtcOffsetMinutes: number, isHeldSeatLiveStart: boolean): DeliveryDecision;
/**
 * REDACTION applies to a notification too.
 *
 * `studio-mobile`: "a notification never carries an amount if the recipient's
 * role does not have `canRevenue`". The argument is decisive — a notification
 * appears on a LOCKED SCREEN.
 */
export declare function mayCarryAmount(recipientCanRevenue: boolean): boolean;
/**
 * The THIRD channel is `in-app`, not `sms` (D-017).
 *
 * The preferences grid offers three channels per trigger, only two are named in
 * the file, and the phone field carries the note "for reminder SMS". An SMS
 * channel has a per-message cost, a regulation of its own — consent, hours,
 * opt-out — and one more provider, for a value nothing has tested.
 */
export declare const DEFAULT_CHANNELS: readonly NotificationChannel[];
/**
 * A reminder is a DATED PROMISE: it follows a postponement and is cancelled
 * with a cancellation; it never fires into the void.
 */
export declare function reminderStillValid(scheduledFor: Instant, currentStartsAt: Instant | null): boolean;
//# sourceMappingURL=index.d.ts.map