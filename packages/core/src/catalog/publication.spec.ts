import { describe, expect, it } from 'vitest';

import {
  PUBLICATION_CHECKLIST_ITEMS,
  isBlockingChecklistItem,
  assertTransitionAllowed,
  irreversiblePromiseBlocking,
  isEventDriven,
  nextPublicationTransitions,
  orderRankOf,
  publicationReadiness,
} from './publication.js';
import { PublicationState } from '../vocabulary/catalog.js';

/**
 * PROTECTED INVARIANT
 *   The lock is on the PAIR `from > to`, never on the STATE.
 *
 * WHY THIS TEST EXISTS
 *   E5: the fixtures encode `lockedTransitions: ['scheduled',
 *   'replay_online']` — a list of STATES — and test membership of the current
 *   state. The mockup encodes pairs. Those are two semantics, and the
 *   difference is not academic: locking a STATE would also prevent ENTERING it.
 *   A date could never be published.
 */
describe('the lock is on the transition', () => {
  it('lets you ENTER a locked state', () => {
    // This is the case the fixtures' semantics would have broken.
    expect(() =>
      assertTransitionAllowed(PublicationState.DRAFT, PublicationState.SCHEDULED, true),
    ).not.toThrow();
  });

  it('refuses to LEAVE it, with the promise made', () => {
    expect(irreversiblePromiseBlocking(PublicationState.SCHEDULED, PublicationState.DRAFT)).toBe(
      'publication.promise.prices_engaged',
    );
    expect(
      irreversiblePromiseBlocking(PublicationState.REPLAY_ONLINE, PublicationState.ENDED),
    ).toBe('publication.promise.replay_on_sale');
  });

  it('tells "one-way" apart from "unknown" — two refusals, two messages', () => {
    // Going back on a committed price is not the same thing as attempting a
    // transition that does not exist. The first deserves an explanation.
    expect(
      irreversiblePromiseBlocking(PublicationState.RESERVE, PublicationState.DRAFT),
    ).toBeNull();
    expect(() =>
      assertTransitionAllowed(PublicationState.DRAFT, PublicationState.LIVE, true),
    ).toThrow();
  });

  it('lets you go back and forth between draft and reserve', () => {
    expect(() =>
      assertTransitionAllowed(PublicationState.DRAFT, PublicationState.RESERVE, true),
    ).not.toThrow();
    expect(() =>
      assertTransitionAllowed(PublicationState.RESERVE, PublicationState.DRAFT, true),
    ).not.toThrow();
  });
});

/**
 * PROTECTED INVARIANT
 *   Two transitions are not commands: they are CAUSED by a `streaming` event.
 *
 * WHY
 *   That is what keeps `Publication` the aggregate of a SINGLE context, when it
 *   looked as if it straddled three. The "go on air" command goes to
 *   `streaming`, which alone knows whether the feed is coming in — `catalog`
 *   LEARNS it.
 */
describe('what the studio does not command', () => {
  it('never offers `technical -> live` or `live -> ended` to an operator', () => {
    const fromTechnical = nextPublicationTransitions(PublicationState.TECHNICAL, true);
    expect(fromTechnical.map((t) => t.to)).not.toContain(PublicationState.LIVE);

    const fromLive = nextPublicationTransitions(PublicationState.LIVE, true);
    expect(fromLive).toEqual([]);
  });

  it('recognises them as caused by an event', () => {
    expect(isEventDriven(PublicationState.TECHNICAL, PublicationState.LIVE)).toBe(true);
    expect(isEventDriven(PublicationState.LIVE, PublicationState.ENDED)).toBe(true);
    expect(isEventDriven(PublicationState.DRAFT, PublicationState.SCHEDULED)).toBe(false);
  });
});

/**
 * PROTECTED INVARIANT
 *   The transitions offered are computed FOR THIS OPERATOR.
 *
 * WHY
 *   Only the owner and production move a date; a run desk sees the sheet and
 *   does not move it. And it is what lets the realtime correction carry the
 *   RECIPIENT's transitions — without which a stale button would stay on
 *   screen, which would only move the defect one notch along.
 */
describe('transitions are per operator', () => {
  it('offers nothing to someone who cannot decide', () => {
    expect(nextPublicationTransitions(PublicationState.DRAFT, false)).toEqual([]);
    expect(nextPublicationTransitions(PublicationState.ENDED, false)).toEqual([]);
  });

  it('offers both ways out of draft to someone who can decide', () => {
    const offered = nextPublicationTransitions(PublicationState.DRAFT, true).map((t) => t.to);
    expect([...offered].sort()).toEqual(['reserve', 'scheduled']);
  });
});

/**
 * PROTECTED INVARIANT
 *   The RANK follows the state machine, never alphabetical order.
 *
 * WHY
 *   `studio-web` Q5: the events table sorts by state. Without a served rank,
 *   each surface would reinvent `STATE_ORDER` — and alphabetical order would
 *   put `draft` after `replay-online`.
 */
describe('the rank of the states', () => {
  it('follows the machine, not the alphabet', () => {
    expect(orderRankOf(PublicationState.DRAFT)).toBeLessThan(
      orderRankOf(PublicationState.SCHEDULED),
    );
    expect(orderRankOf(PublicationState.LIVE)).toBeLessThan(
      orderRankOf(PublicationState.REPLAY_ONLINE),
    );
    // The alphabet would put `draft` (d) after `replay-online` (r): that is not
    // what we want, and it is what a surface would do without a served rank.
    expect(orderRankOf(PublicationState.DRAFT)).toBeLessThan(
      orderRankOf(PublicationState.REPLAY_ONLINE),
    );
  });
});

/**
 * PROTECTED INVARIANT
 *   The authoritative checklist has SEVEN items, and it returns the MISSING
 *   ones — never a percentage.
 *
 * WHY
 *   `studio-web` Q7: the fixtures carry four, the sheet shows seven, and both
 *   answer the same question. The four are an arbitrary subset. And the screen
 *   counts what is missing ("publish — 3 missing"): a percentage would force it
 *   to recompute what the server already knows.
 */
describe('the publication gate', () => {
  it('carries nine items, seven of them blocking', () => {
    // ONE vocabulary. Blocking is a property of the item, because promoting a
    // warning to blocking is a product decision that will happen, and under two
    // vocabularies it moved an item between them — a break for anyone matching
    // on either. Here it flips a boolean.
    expect(PUBLICATION_CHECKLIST_ITEMS).toHaveLength(9);
    expect(PUBLICATION_CHECKLIST_ITEMS.filter(isBlockingChecklistItem)).toHaveLength(7);
  });

  it('returns the list of missing items, not a count', () => {
    const readiness = publicationReadiness(['poster', 'description', 'capacity']);
    expect(readiness.ready).toBe(false);
    expect(readiness.missing).toContain('technical_check_passed');
    expect(readiness.missing).toContain('at_least_one_active_price');
    expect(readiness.missing).toHaveLength(4);
  });

  it('serves all nine with their status, so no surface concatenates two lists', () => {
    const readiness = publicationReadiness(['poster']);
    expect(readiness.entries).toHaveLength(9);
    expect(readiness.entries.every((e) => typeof e.blocking === 'boolean')).toBe(true);
    expect(readiness.entries.find((e) => e.item === 'poster')?.satisfied).toBe(true);
  });

  it('does NOT block on chapters or on the assigned moderator', () => {
    // It must be possible to publish a date without chapters, and an unassigned
    // post can be filled up to the last day. They are warnings — and they are now
    // warnings BY PROPERTY rather than by living in a second vocabulary.
    const blocking = PUBLICATION_CHECKLIST_ITEMS.filter(isBlockingChecklistItem);
    const readiness = publicationReadiness(blocking);
    expect(readiness.ready).toBe(true);
    expect(readiness.warnings).toEqual(['chapters_planned', 'moderator_assigned']);
  });
});
