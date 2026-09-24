/**
 * `displayStateOf` — THE value the cards show, and the only one.
 *
 * E4: three state axes coexisted on a date with no written hierarchy —
 * `publication.state` (seven values), `run.state` (six) and `outcome` (three) —
 * and NONE of them carried the displayed state. Each surface recomposed the
 * hierarchy its own way: the very definition of a value computed twice.
 *
 * The hierarchy, written once:
 *
 *   outcome  OUTRANKS  run.state  OUTRANKS  publication.state  OUTRANKS  time
 *
 * And the rule that makes all this legitimate (`context-map.md` §0): a rule
 * lives once here and is evaluated everywhere. What is forbidden is two
 * IMPLEMENTATIONS, never two CALLS. The server evaluates at serve time and
 * sends `validUntil`; the surface re-evaluates THE SAME FUNCTION when that
 * instant passes.
 */
import type { Instant } from '../kernel/clock.js';
import { DateOutcome, DisplayState, PublicationState, ReplayPolicy, RunState } from '../vocabulary/catalog.js';
/**
 * The BOUNDS of a date — what the contract serves alongside the state.
 *
 * D7: `shared/` carries `startOffsetMin`, an offset relative to the moment the
 * application opens, and `catalogue.json` says it itself — "nothing here
 * expires". Here, instants.
 */
export interface DateTiming {
    readonly startsAt: Instant;
    readonly runtimeMin: number;
    /**
     * 30 minutes today — and it is a SERVED DOMAIN CONSTANT, not a literal copied
     * into five surfaces (E11). The TV mockup copied it into several labels.
     */
    readonly roomOpensBeforeMin: number;
    readonly replayPolicy: ReplayPolicy;
    readonly replayWindowHours: number;
}
export interface DisplayStateInput {
    readonly publicationState: PublicationState;
    readonly runState: RunState | null;
    readonly outcome: DateOutcome | null;
    readonly timing: DateTiming;
    readonly now: Instant;
}
export interface DisplayStateResult {
    readonly state: DisplayState;
    /**
     * The instant at which this state STOPS being true — `null` when only an
     * event can change it (an outcome is a fact; a draft waits for a command).
     *
     * This is what reconciles "no value computed twice" with "a response must
     * still be right eight hours after being cached". Without it, an application
     * waking up shows false states AND DOES NOT KNOW THEY ARE FALSE.
     */
    readonly validUntil: Instant | null;
}
export declare function roomOpensAt(timing: DateTiming): Instant;
export declare function endsAt(timing: DateTiming): Instant;
/**
 * The end of the replay window, or `null` when there is none.
 *
 * It runs from the END of the live show, never from the start. E2: the mobile
 * mockup uses `sub` and `off` where the vocabulary says `subscription` and
 * `none`, and `helpers.stateOf` literally tested `policy !== 'none'` — a date
 * created with `off` would NEVER have been recognised as having no replay.
 * Here the vocabulary is closed and typed: the fault is impossible.
 */
export declare function replayEndsAt(timing: DateTiming): Instant | null;
/** Is the room open? Bounds: `[startsAt - 30 min, startsAt)`. */
export declare function isRoomOpen(timing: DateTiming, now: Instant): boolean;
/** A live show's progress, clamped to `[0, 1]`. */
export declare function progressOf(timing: DateTiming, now: Instant): number;
export declare function displayStateOf(input: DisplayStateInput): DisplayStateResult;
/**
 * Is the date behind us, replay included?
 *
 * Used to sort "My tickets": on air and room open first, then upcoming, then
 * replays available, then closed outcomes, then past. That order is a DOMAIN
 * RULE (`storefront-tv`, `TicketCard`), not a screen preference.
 */
export declare function isFullyOver(timing: DateTiming, now: Instant): boolean;
//# sourceMappingURL=date-state.d.ts.map