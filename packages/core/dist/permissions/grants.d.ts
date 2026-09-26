/**
 * Who may invite whom, over the eight roles — not the six studio personas.
 *
 * Those personas crush `director`, `video` and `sound` into one "run desk":
 * authorising on that label grants a sound engineer an invitation right they do
 * not have (E6).
 */
import { MemberRole } from '../vocabulary/people.js';
/** The roles a person may assign, given those they hold — the union, never a rank. */
export declare function assignableRolesOf(heldRoles: readonly MemberRole[]): readonly MemberRole[];
export declare function canAssign(heldRoles: readonly MemberRole[], target: MemberRole): boolean;
//# sourceMappingURL=grants.d.ts.map