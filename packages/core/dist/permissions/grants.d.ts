/**
 * Who may invite whom — the `grants` table from `catalogue.json`, ported as it
 * stands, over the EIGHT roles.
 *
 * E6 — THE CORRECTION THAT AVOIDS AN AUTHORISATION DEFECT. `studio-data.js`
 * folds the eight roles onto six personas and crushes `director`, `video` and
 * `sound` into a single "run desk". But this table TELLS THEM APART:
 * `director` may invite `video` and `sound`; `video` and `sound` may invite
 * nobody.
 *
 *   Authorising on the short role grants a sound engineer an invitation right
 *   they do not have.
 *
 * The six personas are a presentation LABEL. They do not exist in this package,
 * and that is deliberate: what is not here cannot be used to authorise.
 */
import { MemberRole } from '../vocabulary/people.js';
/**
 * The roles a person may assign, given the roles they hold.
 *
 * The UNION, never a rank: someone holding `coordination` AND `treasury` may
 * assign what `coordination` allows. The studio serves this list MATERIALISED —
 * `studio-web` asks for it explicitly rather than the `grants` table to
 * recompose.
 */
export declare function assignableRolesOf(heldRoles: readonly MemberRole[]): readonly MemberRole[];
export declare function canAssign(heldRoles: readonly MemberRole[], target: MemberRole): boolean;
//# sourceMappingURL=grants.d.ts.map