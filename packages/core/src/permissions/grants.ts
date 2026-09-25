/**
 * Who may invite whom, over the eight roles — not the six studio personas.
 *
 * ⚠ Those personas crush `director`, `video` and `sound` into one "run desk":
 * authorising on that label grants a sound engineer an invitation right they do
 * not have (E6).
 */

import { MemberRole } from '../vocabulary/people.js';

const GRANTS: Readonly<Record<MemberRole, readonly MemberRole[]>> = {
  artist: [
    MemberRole.PRODUCTION,
    MemberRole.COORDINATION,
    MemberRole.DIRECTOR,
    MemberRole.VIDEO,
    MemberRole.SOUND,
    MemberRole.MODERATION,
    MemberRole.TREASURY,
  ],
  production: [
    MemberRole.COORDINATION,
    MemberRole.DIRECTOR,
    MemberRole.VIDEO,
    MemberRole.SOUND,
    MemberRole.MODERATION,
  ],
  coordination: [MemberRole.DIRECTOR, MemberRole.VIDEO, MemberRole.SOUND, MemberRole.MODERATION],
  director: [MemberRole.VIDEO, MemberRole.SOUND],
  video: [],
  sound: [],
  moderation: [],
  treasury: [],
};

/** The roles a person may assign, given those they hold — the union, never a rank. */
export function assignableRolesOf(heldRoles: readonly MemberRole[]): readonly MemberRole[] {
  const assignable = new Set<MemberRole>();
  for (const role of heldRoles) {
    for (const target of GRANTS[role]) assignable.add(target);
  }
  return [...assignable];
}

export function canAssign(heldRoles: readonly MemberRole[], target: MemberRole): boolean {
  return assignableRolesOf(heldRoles).includes(target);
}
