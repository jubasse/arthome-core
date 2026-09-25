/**
 * `displayStateOf` — THE value the cards show, and the only one.
 *
 * E4: three state axes coexisted on a date with no written hierarchy — `publication.state`,
 * `run.state`, `outcome` — and none carried the displayed state, so each surface recomposed it.
 * The hierarchy, once: outcome OUTRANKS run.state OUTRANKS publication.state OUTRANKS time.
 */
import type { Instant } from '../kernel/clock.js';
import { DateOutcome, DisplayState, PublicationState, ReplayPolicy, RunState } from '../vocabulary/catalog.js';
/** The BOUNDS of a date — what the contract serves alongside the state. */
export interface DateTiming {
    readonly startsAt: Instant;
    readonly runtimeMin: number;
    /** A SERVED domain constant, never a literal copied into five surfaces (E11). */
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
     * The instant at which this state STOPS being true — `null` when only an event can change it.
     * Without it, an application waking up shows false states and does not know they are false.
     */
    readonly validUntil: Instant | null;
}
export declare function roomOpensAt(timing: DateTiming): Instant;
export declare function endsAt(timing: DateTiming): Instant;
/**
 * The end of the replay window, or `null` when there is none. It runs from the END of the live
 * show, never from the start.
 */
export declare function replayEndsAt(timing: DateTiming): Instant | null;
/** Is the room open? Bounds: `[startsAt - 30 min, startsAt)`. */
export declare function isRoomOpen(timing: DateTiming, now: Instant): boolean;
/** A live show's progress, clamped to `[0, 1]`. */
export declare function progressOf(timing: DateTiming, now: Instant): number;
export declare function displayStateOf(input: DisplayStateInput): DisplayStateResult;
/** Is the date behind us, replay included? */
export declare function isFullyOver(timing: DateTiming, now: Instant): boolean;
//# sourceMappingURL=date-state.d.ts.map