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
    // A card saying "almost full" while no alert fires baffles the viewer who set it.
    expect(ALMOST_FULL_THRESHOLD_BPS).toBe(SCARCITY_THRESHOLD_BPS);
  });
});

describe('quiet hours', () => {
  it("is computed in the sleeper's offset, not the server's", () => {
    // A server reasoning in UTC would wake everybody up.
    const instant = '2026-09-21T21:30:00.000Z';
    expect(isWithinQuietHours(instant, 120)).toBe(true); // 23:30 in Paris
    expect(isWithinQuietHours(instant, -420)).toBe(false); // 14:30 in Los Angeles
  });

  it('covers the night at BOTH bounds, midnight included', () => {
    // A range straddling midnight is only ever wrong at its two bounds.
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
    const night = '2026-09-21T21:30:00.000Z';
    const decision = shouldDeliverNow(night, 120, false);
    expect(decision.deliver).toBe(false);
    expect(decision.reasonCode).toBe('notification.deferred_quiet_hours');
  });
});

describe('redaction inside a notification', () => {
  it('refuses the amount to anyone not entitled to know it', () => {
    expect(mayCarryAmount(false)).toBe(false);
    expect(mayCarryAmount(true)).toBe(true);
  });
});

describe('a reminder follows its date', () => {
  it('stays valid when the date has not moved', () => {
    expect(reminderStillValid('2026-09-21T18:30:00.000Z', '2026-09-21T19:00:00.000Z')).toBe(true);
  });

  it('stops being valid after a postponement', () => {
    expect(reminderStillValid('2026-09-21T18:30:00.000Z', '2026-09-28T19:00:00.000Z')).toBe(false);
  });

  it('stops being valid when the date is cancelled', () => {
    expect(reminderStillValid('2026-09-21T18:30:00.000Z', null)).toBe(false);
  });
});
