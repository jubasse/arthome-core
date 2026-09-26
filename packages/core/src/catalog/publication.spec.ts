import { describe, expect, it } from 'vitest';

import {
  PUBLICATION_CHECKLIST_ITEMS,
  PublicationChecklistItem,
  checklistSourceOf,
  isBlockingChecklistItem,
  assertCommandedTransition,
  assertTransitionAllowed,
  irreversiblePromiseBlocking,
  isEventDriven,
  nextPublicationTransitions,
  orderRankOf,
  publicationReadiness,
} from './publication.js';
import { DomainError } from '../kernel/errors.js';
import { PublicationPromise, PublicationState } from '../vocabulary/catalog.js';
import { DomainErrorCode } from '../vocabulary/error-codes.js';
import { Service } from '../vocabulary/people.js';

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
      PublicationPromise.PRICES_ENGAGED,
    );
    expect(
      irreversiblePromiseBlocking(PublicationState.REPLAY_ONLINE, PublicationState.ENDED),
    ).toBe(PublicationPromise.REPLAY_SOLD);
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

describe('a commanded transition', () => {
  const draftAtSeven = { state: PublicationState.DRAFT, version: 7 };

  function refusalOf(run: () => unknown): DomainError {
    try {
      run();
    } catch (error) {
      if (error instanceof DomainError) return error;
    }
    throw new Error('expected a DomainError');
  }

  it('is refused on a stale version, with the current state and version', () => {
    const refusal = refusalOf(() =>
      assertCommandedTransition(
        draftAtSeven,
        { to: PublicationState.RESERVE, expectedVersion: 6, acknowledgedPromise: null },
        true,
      ),
    );
    expect(refusal.code).toBe(DomainErrorCode.STATE_CONFLICT);
    expect(refusal.params).toEqual({ state: PublicationState.DRAFT, version: 7 });
  });

  it('refuses a one-way transition whose promise was not acknowledged, naming it', () => {
    const refusal = refusalOf(() =>
      assertCommandedTransition(
        draftAtSeven,
        { to: PublicationState.SCHEDULED, expectedVersion: 7, acknowledgedPromise: null },
        true,
      ),
    );
    expect(refusal.code).toBe(DomainErrorCode.PUBLICATION_PROMISE_UNACKNOWLEDGED);
    expect(refusal.params.promise).toBe(PublicationPromise.PRICES_ENGAGED);
  });

  it('allows it once acknowledged, and returns what it commits', () => {
    const transition = assertCommandedTransition(
      draftAtSeven,
      {
        to: PublicationState.SCHEDULED,
        expectedVersion: 7,
        acknowledgedPromise: PublicationPromise.PRICES_ENGAGED,
      },
      true,
    );
    expect(transition.irreversiblePromiseCode).toBe(PublicationPromise.PRICES_ENGAGED);
  });

  it('checks the version before the transition, since a stale screen is wrong about both', () => {
    const refusal = refusalOf(() =>
      assertCommandedTransition(
        draftAtSeven,
        { to: PublicationState.LIVE, expectedVersion: 3, acknowledgedPromise: null },
        true,
      ),
    );
    expect(refusal.code).toBe(DomainErrorCode.STATE_CONFLICT);
  });
});

describe('the source of a checklist item', () => {
  it('holds only catalog’s own items, and names the context projecting each other one', () => {
    const own = PUBLICATION_CHECKLIST_ITEMS.filter(
      (item) => checklistSourceOf(item) === Service.CATALOG,
    );
    expect(own).toEqual([
      PublicationChecklistItem.TITLE_AND_DISCIPLINE,
      PublicationChecklistItem.POSTER,
      PublicationChecklistItem.DESCRIPTION,
    ]);
    expect(checklistSourceOf(PublicationChecklistItem.AT_LEAST_ONE_ACTIVE_PRICE)).toBe(
      Service.TICKETING,
    );
    expect(checklistSourceOf(PublicationChecklistItem.TECHNICAL_CHECK_PASSED)).toBe(
      Service.STREAMING,
    );
    expect(checklistSourceOf(PublicationChecklistItem.CHAT_MODE_SET)).toBe(Service.CHAT);
  });
});
