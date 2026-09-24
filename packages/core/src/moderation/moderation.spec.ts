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
 * PROTECTED INVARIANT
 *   A verdict is ACCEPTED while a colleague holds the lease, and REFUSED only
 *   if the row is already settled — with the winning verdict.
 *
 * WHY THIS TEST EXISTS
 *   `studio-mobile`'s C3, demonstrated on the contract's own examples: `claim`
 *   then `release` WITHOUT SETTLING ANYTHING moves the version from 1 to 3. A
 *   moderator who reads the queue at `version: 1`, loses the network and
 *   settles sees their verdict REFUSED on reconnection — when the offline queue
 *   is the one concession granted to mobile.
 *
 *   The real rule is a SUPERSESSION: "as long as your colleague has returned no
 *   verdict, your sanction applies". A single counter cannot express "refuse if
 *   settled, accept if merely claimed".
 */
describe('the two moderation counters', () => {
  const claimed: ModerationItemSnapshot = {
    state: ModerationItemState.CLAIMED,
    version: 3, // a colleague claimed then released: the version moved
    decisionVersion: 0, // but NOTHING was settled
    settledBy: null,
    verdict: null,
  };

  it('accepts an offline verdict despite a lease taken in the meantime', () => {
    // The exact case of the defect: the version moved from 1 to 3 with no verdict.
    const outcome = evaluateSettlement(claimed, {
      expectedDecisionVersion: 0,
      verdict: ModerationVerdict.REMOVE,
      origin: StateChangeOrigin.HUMAN_VERDICT,
    });

    expect(outcome.accepted).toBe(true);
  });

  it('refuses a second verdict AND carries the winner', () => {
    // A bare refusal would force a second round trip in the middle of a live
    // show. The screen must be able to say "X has already deleted this message".
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
 * PROTECTED INVARIANT
 *   A human overturns an automatic decision; NEVER the reverse.
 *
 * WHY
 *   Without this rule, a retroactive filter would erase a judgement already
 *   made — and human judgement is precisely what we keep for 24 months and
 *   journal by name. Nothing is built today: the shape must be able to
 *   accommodate a non-human actor without a contract change.
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

/**
 * PROTECTED INVARIANT
 *   Only one badge is shown, and the precedence runs from the PERSON towards
 *   the MESSAGE.
 */
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
 * PROTECTED INVARIANT
 *   The chat's rate is measured in a DECLARED unit.
 *
 * WHY
 *   The mockup computes `messages / hours elapsed`, labels it "MSG/MIN", then
 *   compares it against a threshold of 60 msg/min. Those are not the same
 *   quantities, and the gap is a factor of sixty.
 */
describe('the chat rate', () => {
  it('switches to the queue past the threshold, not before', () => {
    expect(shouldCollapseToQueue(59)).toBe(false);
    expect(shouldCollapseToQueue(60)).toBe(true);
  });
});
