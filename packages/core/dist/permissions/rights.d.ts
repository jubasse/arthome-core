/**
 * EFFECTIVE RIGHTS — computed ONCE here, served by the studio BFF.
 *
 * `studio-web` Q1 asked the question and its position is adopted: the contract
 * serves BOTH — the raw material in the eight-role vocabulary, and the computed
 * effective rights. Without that, the studio web, the studio mobile and each
 * service's guards would read the same table three times.
 *
 * ACCESS IS THE UNION OF THE ROLES, NEVER A RANK. Someone holding `video` and
 * `moderation` on the same channel opens the union of the two. That is the rule
 * the studio mobile tab bar applies, and it is arithmetic: there is no
 * "superior" role.
 */
import { DatePane, MemberRole, NavigationEntry } from '../vocabulary/people.js';
/**
 * `canRevenue` does not hide a column: IT DECIDES WHAT THE RESPONSE CONTAINS.
 *
 * A run desk that received the ticketing gross in its payload and did not show
 * it is a LEAK, not a rule — the payload is in the clear in a WebView,
 * inspectable, and it survives in the phone's HTTP cache (`studio-mobile` §3).
 * The corollary the contract carries: a sort key on an absent field is REFUSED,
 * never ignored.
 */
export declare function canRevenue(heldRoles: readonly MemberRole[]): boolean;
export declare function canDecide(heldRoles: readonly MemberRole[]): boolean;
export declare function canOps(heldRoles: readonly MemberRole[]): boolean;
export interface EffectiveRights {
    readonly navigation: readonly NavigationEntry[];
    readonly openPanes: readonly DatePane[];
    readonly assignableRoles: readonly MemberRole[];
    readonly canRevenue: boolean;
    readonly canDecide: boolean;
    readonly canOps: boolean;
}
/**
 * A person's effective rights ON ONE CHANNEL.
 *
 * ON ONE CHANNEL, and that is an invariant, not a convenience. Run-desk staff
 * and moderators are not employees: they are artists' collaborators or
 * freelancers working across several channels. A right checked against
 * "membership of some channel" would let a freelancer read the moderation
 * queue, the nicknames and the viewer history of a channel that is not theirs —
 * that is not an ergonomics defect, it is a DATA-PROTECTION defect.
 */
export declare function effectiveRightsOf(heldRoles: readonly MemberRole[]): EffectiveRights;
//# sourceMappingURL=rights.d.ts.map