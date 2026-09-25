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
 * E5: the fixtures locked STATES, the mockup locked PAIRS. Locking a state would also prevent
 * ENTERING it, and a date could never be published.
 */
describe('the lock is on the transition', () => {
  it('lets you ENTER a locked state', () => {
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
 * Two transitions are CAUSED by a `streaming` event, never commanded: that is what keeps
 * `Publication` the aggregate of a SINGLE context, when it looked as if it straddled three.
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
 * The transitions offered are computed FOR THIS OPERATOR, which is what lets the realtime
 * correction carry the RECIPIENT's transitions — otherwise a stale button stays on screen.
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

/** `studio-web` Q5: without a served rank, each surface reinvents `STATE_ORDER`, alphabetically. */
describe('the rank of the states', () => {
  it('follows the machine, not the alphabet', () => {
    expect(orderRankOf(PublicationState.DRAFT)).toBeLessThan(
      orderRankOf(PublicationState.SCHEDULED),
    );
    expect(orderRankOf(PublicationState.LIVE)).toBeLessThan(
      orderRankOf(PublicationState.REPLAY_ONLINE),
    );
    expect(orderRankOf(PublicationState.DRAFT)).toBeLessThan(
      orderRankOf(PublicationState.REPLAY_ONLINE),
    );
  });
});

/**
 * `studio-web` Q7: the fixtures carried four items and the sheet showed seven, both answering the
 * same question. The screen counts what is MISSING ("publish — 3 missing"), never a percentage.
 */
describe('the publication gate', () => {
  it('carries nine items, seven of them blocking', () => {
    // Blocking is a PROPERTY of the item: under two vocabularies, promoting a warning moved it
    // between them — a break for anyone matching on either. Here it flips a boolean.
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
    // A date can be published without chapters, and a moderator assigned up to the last day.
    const blocking = PUBLICATION_CHECKLIST_ITEMS.filter(isBlockingChecklistItem);
    const readiness = publicationReadiness(blocking);
    expect(readiness.ready).toBe(true);
    expect(readiness.warnings).toEqual(['chapters_planned', 'moderator_assigned']);
  });
});
