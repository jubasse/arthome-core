/**
 * EFFECTIVE RIGHTS — computed ONCE here, served by the studio BFF.
 *
 * `studio-web` Q1 asked the question and its position is adopted: the contract
 * serves BOTH — the raw material in the eight-role vocabulary, and the computed
 * effective rights. Without that, the studio web, the studio mobile and each
 * service's guards would read the same table three times.
 *
 * ⚠ ACCESS IS THE UNION OF THE ROLES, NEVER A RANK. Someone holding `video` and
 * `moderation` on the same channel opens the union of the two. That is the rule
 * the studio mobile tab bar applies, and it is arithmetic: there is no
 * "superior" role.
 */
import { assignableRolesOf } from './grants.js';
import { DatePane, MemberRole, NavigationEntry } from '../vocabulary/people.js';
const NAVIGATION = {
    artist: [
        NavigationEntry.DASHBOARD,
        NavigationEntry.CREW,
        NavigationEntry.EVENTS,
        NavigationEntry.STREAM,
        NavigationEntry.STATS,
        NavigationEntry.TICKETS,
        NavigationEntry.STORE,
        NavigationEntry.REPLAYS,
        NavigationEntry.PAYOUTS,
        NavigationEntry.JOURNAL,
        NavigationEntry.SETTINGS,
        NavigationEntry.HELP,
    ],
    production: [
        NavigationEntry.DASHBOARD,
        NavigationEntry.CREW,
        NavigationEntry.EVENTS,
        NavigationEntry.STREAM,
        NavigationEntry.STATS,
        NavigationEntry.TICKETS,
        NavigationEntry.STORE,
        NavigationEntry.REPLAYS,
        NavigationEntry.JOURNAL,
        NavigationEntry.HELP,
    ],
    coordination: [NavigationEntry.CREW, NavigationEntry.JOURNAL, NavigationEntry.HELP],
    director: [
        NavigationEntry.AGENDA,
        NavigationEntry.EVENTS,
        NavigationEntry.STREAM,
        NavigationEntry.REPLAYS,
        NavigationEntry.HELP,
    ],
    video: [
        NavigationEntry.AGENDA,
        NavigationEntry.EVENTS,
        NavigationEntry.STREAM,
        NavigationEntry.REPLAYS,
        NavigationEntry.HELP,
    ],
    sound: [
        NavigationEntry.AGENDA,
        NavigationEntry.EVENTS,
        NavigationEntry.STREAM,
        NavigationEntry.REPLAYS,
        NavigationEntry.HELP,
    ],
    moderation: [NavigationEntry.AGENDA, NavigationEntry.MODERATION, NavigationEntry.HELP],
    treasury: [
        NavigationEntry.DASHBOARD,
        NavigationEntry.STATS,
        NavigationEntry.TICKETS,
        NavigationEntry.PAYOUTS,
        NavigationEntry.JOURNAL,
        NavigationEntry.HELP,
    ],
};
const PANES = {
    artist: [
        DatePane.PUBLIC,
        DatePane.TICKETS,
        DatePane.CHAT,
        DatePane.TECH,
        DatePane.CREW,
        DatePane.REPLAY,
    ],
    production: [
        DatePane.PUBLIC,
        DatePane.TICKETS,
        DatePane.CHAT,
        DatePane.TECH,
        DatePane.CREW,
        DatePane.REPLAY,
    ],
    coordination: [DatePane.TECH, DatePane.CREW],
    director: [DatePane.TECH],
    video: [DatePane.TECH],
    sound: [DatePane.TECH],
    moderation: [DatePane.CHAT],
    treasury: [DatePane.TICKETS],
};
/** `canRevenue` = artist ∨ production ∨ treasury. */
const REVENUE_ROLES = [
    MemberRole.ARTIST,
    MemberRole.PRODUCTION,
    MemberRole.TREASURY,
];
/** `canDecide` = artist ∨ production. The acts that commit buyers. */
const DECIDE_ROLES = [MemberRole.ARTIST, MemberRole.PRODUCTION];
/** `canOps` = artist ∨ production ∨ the three run-desk posts. */
const OPS_ROLES = [
    MemberRole.ARTIST,
    MemberRole.PRODUCTION,
    MemberRole.DIRECTOR,
    MemberRole.VIDEO,
    MemberRole.SOUND,
];
function unionOf(table, heldRoles) {
    const union = new Set();
    for (const role of heldRoles) {
        for (const entry of table[role])
            union.add(entry);
    }
    return [...union];
}
/**
 * `canRevenue` does not hide a column: IT DECIDES WHAT THE RESPONSE CONTAINS.
 *
 * A run desk that received the ticketing gross in its payload and did not show
 * it is a LEAK, not a rule — the payload is in the clear in a WebView,
 * inspectable, and it survives in the phone's HTTP cache (`studio-mobile` §3).
 * The corollary the contract carries: a sort key on an absent field is REFUSED,
 * never ignored.
 */
export function canRevenue(heldRoles) {
    return heldRoles.some((role) => REVENUE_ROLES.includes(role));
}
export function canDecide(heldRoles) {
    return heldRoles.some((role) => DECIDE_ROLES.includes(role));
}
export function canOps(heldRoles) {
    return heldRoles.some((role) => OPS_ROLES.includes(role));
}
/**
 * A person's effective rights ON ONE CHANNEL.
 *
 * ⚠ ON ONE CHANNEL, and that is an invariant, not a convenience. Run-desk staff
 * and moderators are not employees: they are artists' collaborators or
 * freelancers working across several channels. A right checked against
 * "membership of some channel" would let a freelancer read the moderation
 * queue, the nicknames and the viewer history of a channel that is not theirs —
 * that is not an ergonomics defect, it is a DATA-PROTECTION defect.
 */
export function effectiveRightsOf(heldRoles) {
    return {
        navigation: unionOf(NAVIGATION, heldRoles),
        openPanes: unionOf(PANES, heldRoles),
        assignableRoles: assignableRolesOf(heldRoles),
        canRevenue: canRevenue(heldRoles),
        canDecide: canDecide(heldRoles),
        canOps: canOps(heldRoles),
    };
}
//# sourceMappingURL=rights.js.map