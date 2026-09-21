/**
 * A publication's state machine, and its two ONE-WAY passages.
 *
 * E5 — the quietest and most important correction: the fixtures encode
 * `lockedTransitions: ['scheduled', 'replay_online']`, a list of STATES, and
 * test membership of the current state. The mockup encodes `from>to` PAIRS.
 * Those are two different semantics, and the second is the right one —
 * locking a STATE would also prevent entering it.
 *
 * And a guarantee the interface does not give: **the server refuses the reverse
 * transition**. Not offering it on screen is a courtesy, not a guarantee.
 */

import { DomainError } from '../kernel/errors.js';
import { PublicationState } from '../vocabulary/catalog.js';

/** An offered transition, with what it commits to. */
export interface PublicationTransition {
  readonly from: PublicationState;
  readonly to: PublicationState;
  /**
   * The CODE of the promise made, served with the refusal so the message can be
   * translated client-side. Null when the transition is reversible.
   */
  readonly irreversiblePromiseCode: string | null;
}

/**
 * The table, written once. Two pairs are one-way:
 *   `draft|reserve -> scheduled`  — publishing commits THE DISPLAYED PRICE;
 *   `ended -> replay-online`      — viewers have PAID for the replay.
 *
 * ⚠ `technical -> live` and `live -> ended` are NOT commands: they are CAUSED
 * by `streaming.run.started.v1` and `streaming.run.ended.v1`. That is what
 * keeps `Publication` the aggregate of a single context, when it looked as if
 * it straddled three. The "go on air" command goes to `streaming`, which alone
 * knows whether the feed is coming in.
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

/**
 * The RANK of a state, served with it.
 *
 * The studio's events table sorts BY STATE, and the order is the machine's, not
 * alphabetical. Without a served rank, each surface would reinvent
 * `STATE_ORDER` — `studio-web` Q5.
 */
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
 * The transitions offered TO THIS OPERATOR.
 *
 * `canDecide` (artist ∨ production) is an ARGUMENT: only the owner and
 * production move a date; a run desk sees the sheet and does not move it.
 * Serving the list stops every surface recomputing the table — and it is also
 * what lets the realtime correction carry the RECIPIENT's transitions, without
 * which a stale button would stay on screen (`realtime.md` §3.3).
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
 * The lock is on the PAIR, never on the state.
 *
 * Returns the code of the promise made when the reverse transition is refused,
 * `null` when it is simply unknown — two different refusals, two different
 * messages.
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
      code: 'publication.transition_irreversible',
      params: { from, to, promise },
    });
  }
  const allowed = nextPublicationTransitions(from, canDecide);
  if (!allowed.some((transition) => transition.to === to)) {
    throw new DomainError({ code: 'publication.transition_forbidden', params: { from, to } });
  }
}

/**
 * THE AUTHORITATIVE CHECKLIST: SEVEN items, the ones on the sheet.
 *
 * `studio-web` Q7: the fixtures carry FOUR, the sheet shows SEVEN, and both
 * answer the same question. The four are an arbitrary subset; the seven are the
 * ones a screen actually exercised.
 *
 * ⚠ THREE of the seven are FACTS PROJECTED from other contexts —
 * `at_least_one_active_price` and `capacity` come from `ticketing`,
 * `technical_check_passed` from `streaming`. `catalog` keeps them up to date by
 * event and asks nobody for them: that is what stops a publication needing a
 * synchronous call to two services.
 */
export const PUBLICATION_CHECKLIST_ITEMS = [
  'title_and_discipline',
  'poster',
  'description',
  'at_least_one_active_price',
  'capacity',
  'technical_check_passed',
  'chat_mode_set',
] as const;
export type PublicationChecklistItem = (typeof PUBLICATION_CHECKLIST_ITEMS)[number];

/**
 * The NON-BLOCKING warnings.
 *
 * "Chapters planned" and "moderator assigned" leave the blocking list: it must
 * be possible to publish a date without chapters, and an unassigned post can be
 * filled up to the last day.
 */
export const PUBLICATION_WARNING_ITEMS = ['chapters_planned', 'moderator_assigned'] as const;
export type PublicationWarningItem = (typeof PUBLICATION_WARNING_ITEMS)[number];

export interface PublicationReadiness {
  readonly ready: boolean;
  /** The MISSING identifiers — never a percentage, which the client computes. */
  readonly missing: readonly PublicationChecklistItem[];
  readonly warnings: readonly PublicationWarningItem[];
}

export function publicationReadiness(
  satisfied: readonly PublicationChecklistItem[],
  satisfiedWarnings: readonly PublicationWarningItem[],
): PublicationReadiness {
  const missing = PUBLICATION_CHECKLIST_ITEMS.filter((item) => !satisfied.includes(item));
  const warnings = PUBLICATION_WARNING_ITEMS.filter((item) => !satisfiedWarnings.includes(item));
  return { ready: missing.length === 0, missing, warnings };
}
