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
  'chapters_planned',
  'moderator_assigned',
] as const;
export type PublicationChecklistItem = (typeof PUBLICATION_CHECKLIST_ITEMS)[number];

/**
 * BLOCKING IS A PROPERTY OF THE ITEM, NOT A SEPARATE VOCABULARY.
 *
 * This was two vocabularies — seven blocking items and two warnings — and the
 * split was wrong on two counts.
 *
 * Promoting a warning to blocking is a product decision that WILL happen. Under
 * the split it moves an item from one vocabulary to another, which breaks
 * anyone matching on either. Here it flips a boolean.
 *
 * And a client rendering the checklist wants all nine with their status. Two
 * lists forced every surface to concatenate them — a composition the server
 * should have served, which is the same fault as making a surface recompose
 * `displayState`.
 */
/**
 * A TABLE KEYED BY THE TYPE, NOT A LIST OF THE BLOCKING SEVEN.
 *
 * This was an array of seven members written out again twenty-eight lines below
 * the declaration — **the split this comment argues against, surviving one level
 * down**. Merging the two vocabularies changed what is exported without
 * changing what has to be edited, which is the part the argument was about:
 * promoting `chapters_planned` meant editing a literal list, the same edit in
 * the same shape as moving it between two vocabularies.
 *
 * And it drifted in the direction nothing catches. A tenth item added to
 * `PUBLICATION_CHECKLIST_ITEMS` was silently NON-BLOCKING, because `includes`
 * on a list that never heard of it returns `false` — no type error, since
 * `PublicationChecklistItem` admits the member and the array simply lacks it.
 *
 * A `Record` keyed by the union makes a missing member a **compile error**, so
 * the tenth item cannot be added without a decision about whether it blocks.
 * That is the boolean flip the paragraph above promises, checked by `tsc`
 * rather than by a reviewer.
 *
 * It was invisible to `arthome-check-enums` because this file DECLARES a
 * vocabulary, and the gate excludes a declaring file from the sweep entirely
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
  /** All NINE, in declaration order — the surface renders this, it composes nothing. */
  readonly entries: readonly PublicationChecklistEntry[];
  /** The MISSING blocking identifiers — never a percentage, which the client computes. */
  readonly missing: readonly PublicationChecklistItem[];
  /** The unmet NON-blocking items. Derived from `entries`; served because the screen labels them differently. */
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
