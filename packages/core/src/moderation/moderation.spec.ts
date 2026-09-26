import { describe, expect, it } from 'vitest';

import {
  ModerationBadge,
  canOverride,
  evaluateSettlement,
  moderationBadgeOf,
  shouldCollapseToQueue,
  type ModerationItemSnapshot,
} from './index.js';
import {
  AudienceSanction,
  MessageState,
  ModerationItemState,
  ModerationVerdict,
  StateChangeOrigin,
} from '../vocabulary/moderation.js';

/**
 * C3: `claim` then `release` without settling anything moves the version from
 * 1 to 3, so a single counter refuses an offline verdict that nothing has
 * overruled. Hence two counters — refuse if settled, accept if merely claimed.
 */
describe('the two moderation counters', () => {
  const claimed: ModerationItemSnapshot = {
    state: ModerationItemState.CLAIMED,
    version: 3, // a colleague claimed then released: the version moved
    decisionVersion: 0, // but nothing was settled
    settledBy: null,
    verdict: null,
  };

  it('accepts an offline verdict despite a lease taken in the meantime', () => {
    const outcome = evaluateSettlement(claimed, {
      expectedDecisionVersion: 0,
      verdict: ModerationVerdict.REMOVE,
      origin: StateChangeOrigin.HUMAN_VERDICT,
    });

    expect(outcome.accepted).toBe(true);
  });

  it('refuses a second verdict AND carries the winner', () => {
    // The screen must be able to say "X has already deleted this message" without
    // a second round trip in the middle of a live show.
    const settled: ModerationItemSnapshot = {
      state: ModerationItemState.SETTLED,
      version: 5,
      decisionVersion: 1,
      settledBy: 'person:ana',
      verdict: ModerationVerdict.REMOVE,
    };

    const outcome = evaluateSettlement(settled, {
      expectedDecisionVersion: 0,
      verdict: ModerationVerdict.PUBLISH,
      origin: StateChangeOrigin.HUMAN_VERDICT,
    });

    expect(outcome).toEqual({
      accepted: false,
      code: 'moderation.already_settled',
      winner: { verdict: ModerationVerdict.REMOVE, settledBy: 'person:ana' },
    });
  });

  it('refuses when the settlement has moved on since the read', () => {
    const advanced: ModerationItemSnapshot = { ...claimed, decisionVersion: 2 };
    const outcome = evaluateSettlement(advanced, {
      expectedDecisionVersion: 0,
      verdict: ModerationVerdict.REMOVE,
      origin: StateChangeOrigin.HUMAN_VERDICT,
    });

    expect(outcome.accepted).toBe(false);
  });
});

/**
 * A human overturns an automatic decision, never the reverse: a retroactive
 * filter must not erase a judgement kept for 24 months and journalled by name.
 */
describe('the human / automatic precedence', () => {
  it('lets a human overturn an automatic decision', () => {
    expect(canOverride(StateChangeOrigin.AUTOMATIC_FILTER, StateChangeOrigin.HUMAN_VERDICT)).toBe(
      true,
    );
    expect(canOverride(StateChangeOrigin.RETROACTIVE_FILTER, StateChangeOrigin.HUMAN_VERDICT)).toBe(
      true,
    );
  });

  it('forbids the automatic side overturning a human', () => {
    expect(canOverride(StateChangeOrigin.HUMAN_VERDICT, StateChangeOrigin.AUTOMATIC_FILTER)).toBe(
      false,
    );
    expect(canOverride(StateChangeOrigin.HUMAN_VERDICT, StateChangeOrigin.RETROACTIVE_FILTER)).toBe(
      false,
    );
  });

  it('lets a human revisit a human', () => {
    expect(canOverride(StateChangeOrigin.HUMAN_VERDICT, StateChangeOrigin.HUMAN_VERDICT)).toBe(
      true,
    );
  });
});

describe('the single badge', () => {
  it("makes the person's sanction outrank the message's state", () => {
    expect(moderationBadgeOf(MessageState.PUBLISHED, AudienceSanction.BANNED)).toBe(
      ModerationBadge.BANNED,
    );
    expect(moderationBadgeOf(MessageState.REMOVED, AudienceSanction.MUTED)).toBe(
      ModerationBadge.MUTED,
    );
    expect(moderationBadgeOf(MessageState.REMOVED, AudienceSanction.NONE)).toBe(
      ModerationBadge.REMOVED,
    );
    expect(moderationBadgeOf(MessageState.PUBLISHED, AudienceSanction.NONE)).toBe(
      ModerationBadge.PUBLISHED,
    );
  });
});

/**
 * The mockup computes `messages / hours elapsed`, labels it "MSG/MIN" and
 * compares it against 60 msg/min: a factor of sixty. The unit is declared.
 */
describe('the chat rate', () => {
  it('switches to the queue past the threshold, not before', () => {
    expect(shouldCollapseToQueue(59)).toBe(false);
    expect(shouldCollapseToQueue(60)).toBe(true);
  });
});
