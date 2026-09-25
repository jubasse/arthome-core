/**
 * A publication's state machine, and its two one-way passages.
 *
 * E5: the fixtures encoded `lockedTransitions` as a list of STATES and tested membership of the
 * current state; the mockup encoded `from>to` PAIRS. The second is right — locking a state would
 * also prevent entering it.
 *
 * The server refuses the reverse transition. Not offering it on screen is a courtesy, not a
 * guarantee.
 */

import { DomainError } from '../kernel/errors.js';
import { PublicationState } from '../vocabulary/catalog.js';
import { DomainErrorCode } from '../vocabulary/error-codes.js';

/** An offered transition, with what it commits to. */
export interface PublicationTransition {
  readonly from: PublicationState;
  readonly to: PublicationState;
  /** The promise's code, served with the refusal so the message is translated client-side. */
  readonly irreversiblePromiseCode: string | null;
}

/**
 * The table, written once. Two pairs are one-way:
 *   `draft|reserve -> scheduled`  — publishing commits the displayed price;
 *   `ended -> replay-online`      — viewers have paid for the replay.
 *
 * ⚠ `technical -> live` and `live -> ended` are not commands: they are caused by
 * `streaming.run.started.v1` and `streaming.run.ended.v1`, which is what keeps `Publication` the
 * aggregate of a single context. "Go on air" goes to `streaming`, which alone knows whether the
 * feed is coming in.
 */
const TRANSITIONS: readonly PublicationTransition[] = [
  { from: PublicationState.DRAFT, to: PublicationState.RESERVE, irreversiblePromiseCode: null },
  { from: PublicationState.RESERVE, to: PublicationState.DRAFT, irreversiblePromiseCode: null },
  {
    from: PublicationState.DRAFT,
    to: PublicationState.SCHEDULED,
    irreversiblePromiseCode: 'publication.promise.prices_engaged',
  },
  {
    from: PublicationState.RESERVE,
    to: PublicationState.SCHEDULED,
    irreversiblePromiseCode: 'publication.promise.prices_engaged',
  },
  {
    from: PublicationState.SCHEDULED,
    to: PublicationState.TECHNICAL,
    irreversiblePromiseCode: null,
  },
  {
    from: PublicationState.TECHNICAL,
    to: PublicationState.SCHEDULED,
    irreversiblePromiseCode: null,
  },
  {
    from: PublicationState.ENDED,
    to: PublicationState.REPLAY_ONLINE,
    irreversiblePromiseCode: 'publication.promise.replay_on_sale',
  },
];

/** The transitions caused by an event, never by a studio command. */
const EVENT_DRIVEN: readonly PublicationTransition[] = [
  { from: PublicationState.TECHNICAL, to: PublicationState.LIVE, irreversiblePromiseCode: null },
  { from: PublicationState.LIVE, to: PublicationState.ENDED, irreversiblePromiseCode: null },
];

// The studio's events table sorts by state, in the machine's order rather than alphabetically.
// Without a served rank each surface reinvents `STATE_ORDER` (`studio-web` Q5).
const ORDER: readonly PublicationState[] = [
  PublicationState.DRAFT,
  PublicationState.RESERVE,
  PublicationState.SCHEDULED,
  PublicationState.TECHNICAL,
  PublicationState.LIVE,
  PublicationState.ENDED,
  PublicationState.REPLAY_ONLINE,
];

export function orderRankOf(state: PublicationState): number {
  return ORDER.indexOf(state);
}

/**
 * The transitions offered to this operator.
 *
 * `canDecide` (artist ∨ production) is an argument because a run desk sees the sheet and does not
 * move it, and because the realtime correction has to carry the RECIPIENT's transitions —
 * without which a stale button stays on screen (`realtime.md` §3.3).
 */
export function nextPublicationTransitions(
  from: PublicationState,
  canDecide: boolean,
): readonly PublicationTransition[] {
  if (!canDecide) return [];
  return TRANSITIONS.filter((transition) => transition.from === from);
}

/** Is this transition caused by an event rather than commanded? */
export function isEventDriven(from: PublicationState, to: PublicationState): boolean {
  return EVENT_DRIVEN.some((transition) => transition.from === from && transition.to === to);
}

/**
 * The promise blocking this transition, or `null` when it is merely unknown — two different
 * refusals, two different messages. The lock is on the pair, never on the state.
 */
export function irreversiblePromiseBlocking(
  from: PublicationState,
  to: PublicationState,
): string | null {
  const reverse = TRANSITIONS.find(
    (transition) => transition.from === to && transition.to === from,
  );
  return reverse?.irreversiblePromiseCode ?? null;
}

export function assertTransitionAllowed(
  from: PublicationState,
  to: PublicationState,
  canDecide: boolean,
): void {
  const promise = irreversiblePromiseBlocking(from, to);
  if (promise !== null) {
    throw new DomainError({
      code: DomainErrorCode.PUBLICATION_TRANSITION_IRREVERSIBLE,
      params: { from, to, promise },
    });
  }
  const allowed = nextPublicationTransitions(from, canDecide);
  if (!allowed.some((transition) => transition.to === to)) {
    throw new DomainError({
      code: DomainErrorCode.PUBLICATION_TRANSITION_FORBIDDEN,
      params: { from, to },
    });
  }
}

/**
 * The authoritative checklist, in the order the sheet shows. `studio-web` Q7: the fixtures
 * carried four items and the sheet seven, an arbitrary subset against the ones a screen
 * exercised.
 *
 * ⚠ Three are facts projected from other contexts — `at_least_one_active_price` and `capacity`
 * from `ticketing`, `technical_check_passed` from `streaming`. `catalog` keeps them current by
 * event and asks nobody, which is what stops a publication needing two synchronous calls.
 */
export const PUBLICATION_CHECKLIST_ITEMS = [
  'title_and_discipline',
  'poster',
  'description',
  'at_least_one_active_price',
  'capacity',
  'technical_check_passed',
  'chat_mode_set',
  'chapters_planned',
  'moderator_assigned',
] as const;
export type PublicationChecklistItem = (typeof PUBLICATION_CHECKLIST_ITEMS)[number];

/** The named members, so that nothing writes one of these as a string. */
export const PublicationChecklistItem = {
  TITLE_AND_DISCIPLINE: 'title_and_discipline',
  POSTER: 'poster',
  DESCRIPTION: 'description',
  AT_LEAST_ONE_ACTIVE_PRICE: 'at_least_one_active_price',
  CAPACITY: 'capacity',
  TECHNICAL_CHECK_PASSED: 'technical_check_passed',
  CHAT_MODE_SET: 'chat_mode_set',
  CHAPTERS_PLANNED: 'chapters_planned',
  MODERATOR_ASSIGNED: 'moderator_assigned',
} as const;

/**
 * Blocking is a property of the item, not a separate vocabulary. Promoting a warning to blocking
 * will happen: under two vocabularies it moves an item between them and breaks anyone matching on
 * either, and a client rendering the checklist wants all nine with their status rather than two
 * lists to concatenate. Here it flips a boolean.
 *
 * ⚠ A `Record` keyed by the union, not an array of the blocking seven. The array drifted in the
 * direction nothing catches: a tenth item added to `PUBLICATION_CHECKLIST_ITEMS` was silently
 * non-blocking, since `includes` returns `false` with no type error. A missing key is a compile
 * error, so a tenth item cannot be added without a decision about whether it blocks. It was
 * invisible to `arthome-check-enums`, which excludes a declaring file from the sweep entirely
 * rather than excluding it from its own values.
 */
const BLOCKING: Readonly<Record<PublicationChecklistItem, boolean>> = {
  title_and_discipline: true,
  poster: true,
  description: true,
  at_least_one_active_price: true,
  capacity: true,
  technical_check_passed: true,
  chat_mode_set: true,
  chapters_planned: false,
  moderator_assigned: false,
};

export function isBlockingChecklistItem(item: PublicationChecklistItem): boolean {
  return BLOCKING[item];
}

/** One checklist item, with everything a surface needs to render its row. */
export interface PublicationChecklistEntry {
  readonly item: PublicationChecklistItem;
  readonly satisfied: boolean;
  readonly blocking: boolean;
}

export interface PublicationReadiness {
  readonly ready: boolean;
  /** All nine, in declaration order: the surface renders this and composes nothing. */
  readonly entries: readonly PublicationChecklistEntry[];
  /** The missing blocking identifiers, never a percentage — the client computes that. */
  readonly missing: readonly PublicationChecklistItem[];
  /** The unmet non-blocking items, served because the screen labels them differently. */
  readonly warnings: readonly PublicationChecklistItem[];
}

export function publicationReadiness(
  satisfied: readonly PublicationChecklistItem[],
): PublicationReadiness {
  const entries = PUBLICATION_CHECKLIST_ITEMS.map((item) => ({
    item,
    satisfied: satisfied.includes(item),
    blocking: isBlockingChecklistItem(item),
  }));
  const missing = entries.filter((e) => e.blocking && !e.satisfied).map((e) => e.item);
  const warnings = entries.filter((e) => !e.blocking && !e.satisfied).map((e) => e.item);
  return { ready: missing.length === 0, entries, missing, warnings };
}
