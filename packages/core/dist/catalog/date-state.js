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
import { isAfter, isBefore, minutesBetween, plusHours, plusMinutes } from '../time/instant.js';
// Each name carries BOTH of its meanings: the type (the union of values) and
// the object of named members. One import is enough, and a rule never writes a
// string literal — that is what makes `arthome-check-enums` bearable in use.
import { DateOutcome, DisplayState, PublicationState, ReplayPolicy, RunState, } from '../vocabulary/catalog.js';
export function roomOpensAt(timing) {
    return plusMinutes(timing.startsAt, -timing.roomOpensBeforeMin);
}
export function endsAt(timing) {
    return plusMinutes(timing.startsAt, timing.runtimeMin);
}
/**
 * The end of the replay window, or `null` when there is none.
 *
 * It runs from the END of the live show, never from the start. E2: the mobile
 * mockup uses `sub` and `off` where the vocabulary says `subscription` and
 * `none`, and `helpers.stateOf` literally tested `policy !== 'none'` — a date
 * created with `off` would NEVER have been recognised as having no replay.
 * Here the vocabulary is closed and typed: the fault is impossible.
 */
export function replayEndsAt(timing) {
    if (timing.replayPolicy === ReplayPolicy.NONE || timing.replayWindowHours <= 0)
        return null;
    return plusHours(endsAt(timing), timing.replayWindowHours);
}
/** Is the room open? Bounds: `[startsAt - 30 min, startsAt)`. */
export function isRoomOpen(timing, now) {
    return !isBefore(now, roomOpensAt(timing)) && isBefore(now, timing.startsAt);
}
/** A live show's progress, clamped to `[0, 1]`. */
export function progressOf(timing, now) {
    if (timing.runtimeMin <= 0)
        return 0;
    const elapsed = minutesBetween(timing.startsAt, now);
    return Math.min(1, Math.max(0, elapsed / timing.runtimeMin));
}
/** The outcome, translated into a displayed state. It REPLACES everything else. */
function outcomeDisplay(outcome) {
    switch (outcome) {
        case DateOutcome.POSTPONED:
            return DisplayState.POSTPONED;
        case DateOutcome.CANCELLED:
            return DisplayState.CANCELLED;
        case DateOutcome.INTERRUPTED:
            return DisplayState.INTERRUPTED;
    }
}
/**
 * The publication states that are not yet public: the displayed state IS the
 * publication state.
 *
 * The studio shows those dates, and `displayState` is prescribed on BOTH
 * products — the studio first, since it is the one with three axes to
 * reconcile.
 */
function preSaleDisplay(state) {
    switch (state) {
        case PublicationState.DRAFT:
            return DisplayState.DRAFT;
        case PublicationState.RESERVE:
            return DisplayState.RESERVE;
        case PublicationState.TECHNICAL:
            return DisplayState.TECHNICAL;
        default:
            return null;
    }
}
export function displayStateOf(input) {
    const { publicationState, runState, outcome, timing, now } = input;
    // 1. THE OUTCOME OUTRANKS EVERYTHING. And it never expires: it is a fact.
    if (outcome !== null) {
        return { state: outcomeDisplay(outcome), validUntil: null };
    }
    // 2. BEING ON AIR outranks time — the run desk can go on air before the
    //    announced hour, and it is the run desk that is authoritative.
    //    `interrupted` stays LIVE: `streaming.md` states that the standby screen
    //    is a VEIL laid over an intact video, never a switch. As long as no
    //    outcome is declared, the show can resume.
    if (runState === RunState.ON_AIR || runState === RunState.INTERRUPTED) {
        return { state: DisplayState.LIVE, validUntil: endsAt(timing) };
    }
    // 3. The non-public states: the badge IS the publication state, and only a
    //    command changes it.
    const preSale = preSaleDisplay(publicationState);
    if (preSale !== null) {
        return { state: preSale, validUntil: null };
    }
    // 4. TIME, last — and it is time that carries the useful `validUntil`s.
    const opensAt = roomOpensAt(timing);
    if (isBefore(now, opensAt)) {
        return { state: DisplayState.SCHEDULED, validUntil: opensAt };
    }
    if (isBefore(now, timing.startsAt)) {
        return { state: DisplayState.ROOM_OPEN, validUntil: timing.startsAt };
    }
    const finishesAt = endsAt(timing);
    if (isBefore(now, finishesAt)) {
        return { state: DisplayState.LIVE, validUntil: finishesAt };
    }
    const replayUntil = replayEndsAt(timing);
    if (replayUntil !== null && isBefore(now, replayUntil)) {
        return { state: DisplayState.REPLAY, validUntil: replayUntil };
    }
    return { state: DisplayState.ENDED, validUntil: null };
}
/**
 * Is the date behind us, replay included?
 *
 * Used to sort "My tickets": on air and room open first, then upcoming, then
 * replays available, then closed outcomes, then past. That order is a DOMAIN
 * RULE (`storefront-tv`, `TicketCard`), not a screen preference.
 */
export function isFullyOver(timing, now) {
    const replayUntil = replayEndsAt(timing);
    return isAfter(now, replayUntil ?? endsAt(timing));
}
//# sourceMappingURL=date-state.js.map