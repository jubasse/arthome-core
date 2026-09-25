/**
 * The thresholds below are domain rules, not screen copy: copied into labels
 * they diverge — the web says 30 minutes, the TV 15, mobile is right by accident.
 */
import type { Instant } from '../kernel/clock.js';
import { NotificationChannel } from '../vocabulary/people.js';
/** A followed artist goes on air: as soon as the feed opens. */
export declare const LIVE_START_LEAD_MINUTES = 0;
/** Reminder before a live show for which I hold a seat. */
export declare const REMINDER_LEAD_MINUTES = 30;
/** "Almost full" — the same number as a card's scarcity threshold. */
export declare const ALMOST_FULL_THRESHOLD_BPS = 8500;
/** End of a replay's availability. */
export declare const REPLAY_EXPIRY_WARNING_HOURS = 6;
/** Moderation queue saturated. */
export declare const MODERATION_QUEUE_ALERT_SIZE = 10;
/** Crew post unassigned at D-1. */
export declare const CREW_UNASSIGNED_ALERT_HOURS = 24;
export declare function reminderInstantFor(startsAt: Instant): Instant;
/** Quiet hours, 23:00 -> 09:00, in the sleeper's own offset and never the server's. */
export declare const QUIET_HOURS_START = 23;
export declare const QUIET_HOURS_END = 9;
export declare function isWithinQuietHours(instant: Instant, viewerUtcOffsetMinutes: number): boolean;
export interface DeliveryDecision {
    readonly deliver: boolean;
    readonly reasonCode: string | null;
}
/** Whether to deliver now — the quiet-hours exception covers a held seat's live start only. */
export declare function shouldDeliverNow(instant: Instant, viewerUtcOffsetMinutes: number, isHeldSeatLiveStart: boolean): DeliveryDecision;
/** Redaction reaches a notification too: it appears on a locked screen. */
export declare function mayCarryAmount(recipientCanRevenue: boolean): boolean;
/** The channels every trigger offers by default — the third is in-app, not sms (D-017). */
export declare const DEFAULT_CHANNELS: readonly NotificationChannel[];
/** Whether a scheduled reminder still matches the date it was placed for. */
export declare function reminderStillValid(scheduledFor: Instant, currentStartsAt: Instant | null): boolean;
//# sourceMappingURL=index.d.ts.map