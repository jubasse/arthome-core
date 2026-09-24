import { describe, expect, it } from 'vitest';

import {
  ALMOST_FULL_THRESHOLD_BPS,
  CREW_UNASSIGNED_ALERT_HOURS,
  MODERATION_QUEUE_ALERT_SIZE,
  REMINDER_LEAD_MINUTES,
  isWithinQuietHours,
  mayCarryAmount,
  reminderInstantFor,
  reminderStillValid,
  shouldDeliverNow,
} from './index.js';
import { SCARCITY_THRESHOLD_BPS } from '../ticketing/seats.js';

/**
 * PROTECTED INVARIANT
 *   The five thresholds are SERVED DOMAIN RULES, not screen copy.
 *
 * WHY THIS TEST EXISTS
 *   `storefront-mobile` Q10: "copied, they will diverge — the web will say
 *   30 minutes, the TV 15, and mobile will be right by accident". Two of them
 *   had NO owner anywhere (G6).
 */
describe('the five thresholds', () => {
  it('carries the two that had no owner', () => {
    expect(MODERATION_QUEUE_ALERT_SIZE).toBe(10);
    expect(CREW_UNASSIGNED_ALERT_HOURS).toBe(24);
  });

  it('reminds thirty minutes before curtain-up', () => {
    expect(REMINDER_LEAD_MINUTES).toBe(30);
    expect(reminderInstantFor('2026-09-21T19:00:00.000Z')).toBe('2026-09-21T18:30:00.000Z');
  });

  it("shares EXACTLY a card's scarcity threshold", () => {
    // The test that protects an invisible consistency: a card saying "almost
    // full" while no alert fires would be incomprehensible to the viewer who
    // turned that alert on.
    expect(ALMOST_FULL_THRESHOLD_BPS).toBe(SCARCITY_THRESHOLD_BPS);
  });
});

/**
 * PROTECTED INVARIANT
 *   Quiet hours are the SLEEPER's, and their exception is NARROW.
 *
 * WHY
 *   `storefront-web`: "the quiet-hours rule has an exception conditioned on
 *   holding a seat — that is a business rule of the notification service, not
 *   an interface setting".
 */
describe('quiet hours', () => {
  it("is computed in the sleeper's offset, not the server's", () => {
    // 23:30 in Paris (UTC+2) = 21:30 UTC. A server reasoning in UTC would wake
    // everybody up.
    const instant = '2026-09-21T21:30:00.000Z';
    expect(isWithinQuietHours(instant, 120)).toBe(true); // 23:30 in Paris
    expect(isWithinQuietHours(instant, -420)).toBe(false); // 14:30 in Los Angeles
  });

  it('covers the night at BOTH bounds, midnight included', () => {
    // The bounds are the only place a range that straddles midnight gets it
    // wrong: `hour >= 23 || hour < 9` must be true on both sides of zero.
    const at = (isoHourUtc: string) => isWithinQuietHours(isoHourUtc, 120);
    expect(at('2026-09-21T20:59:00.000Z')).toBe(false); // 22:59
    expect(at('2026-09-21T21:00:00.000Z')).toBe(true); // 23:00 — the lower bound
    expect(at('2026-09-21T22:00:00.000Z')).toBe(true); // midnight
    expect(at('2026-09-22T05:00:00.000Z')).toBe(true); // 07:00
    expect(at('2026-09-22T06:59:00.000Z')).toBe(true); // 08:59
    expect(at('2026-09-22T07:00:00.000Z')).toBe(false); // 09:00 — the upper bound
  });

  it('lets through the start of a live show for which a seat is held', () => {
    const night = '2026-09-21T21:30:00.000Z'; // 23:30 in Paris
    expect(shouldDeliverNow(night, 120, true).deliver).toBe(true);
    expect(shouldDeliverNow(night, 120, true).reasonCode).toBe(
      'notification.quiet_hours_exception_held_seat',
    );
  });

  it('does NOT extend the exception to the other triggers', () => {
    // A "new date announced" reminder at 3 a.m. stays refused: that is the
    // whole point of quiet hours.
    const night = '2026-09-21T21:30:00.000Z';
    const decision = shouldDeliverNow(night, 120, false);
    expect(decision.deliver).toBe(false);
    expect(decision.reasonCode).toBe('notification.deferred_quiet_hours');
  });
});

/**
 * PROTECTED INVARIANT
 *   A notification NEVER carries an amount if the recipient's role does not
 *   have `canRevenue`.
 *
 * WHY
 *   `studio-mobile`'s argument is decisive: a notification appears on a LOCKED
 *   SCREEN. Redaction by role does not stop at an API payload.
 */
describe('redaction inside a notification', () => {
  it('refuses the amount to anyone not entitled to know it', () => {
    expect(mayCarryAmount(false)).toBe(false);
    expect(mayCarryAmount(true)).toBe(true);
  });
});

/**
 * PROTECTED INVARIANT
 *   A reminder is a DATED PROMISE: it follows a postponement, and it is
 *   cancelled with a cancellation — it never fires into the void.
 */
describe('a reminder follows its date', () => {
  it('stays valid when the date has not moved', () => {
    expect(reminderStillValid('2026-09-21T18:30:00.000Z', '2026-09-21T19:00:00.000Z')).toBe(true);
  });

  it('stops being valid after a postponement', () => {
    // The reminder must FOLLOW the postponement, so the old one is invalid and
    // a new one is placed. Without this test, a reminder would fire for a date
    // that no longer happens.
    expect(reminderStillValid('2026-09-21T18:30:00.000Z', '2026-09-28T19:00:00.000Z')).toBe(false);
  });

  it('stops being valid when the date is cancelled', () => {
    expect(reminderStillValid('2026-09-21T18:30:00.000Z', null)).toBe(false);
  });
});
