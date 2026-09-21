/**
 * Qui peut inviter qui — la table `grants` de `catalogue.json`, portee telle
 * quelle, sur les HUIT roles.
 *
 * E6 — LA CORRECTION QUI EVITE UN DEFAUT D'AUTORISATION. `studio-data.js`
 * rabat les huit roles sur six personas et ecrase `director`, `video` et
 * `sound` en un seul « regie ». Or cette table les DISTINGUE : `director` peut
 * inviter `video` et `sound` ; `video` et `sound` ne peuvent inviter personne.
 *
 *   Autoriser sur le role court accorde a un regisseur son un droit
 *   d'invitation qu'il n'a pas.
 *
 * Les six personas sont un LIBELLE de presentation. Ils n'existent pas dans ce
 * paquet, et c'est delibere : ce qui n'est pas ici ne peut pas servir a
 * autoriser.
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
  coordination: [
    MemberRole.DIRECTOR,
    MemberRole.VIDEO,
    MemberRole.SOUND,
    MemberRole.MODERATION,
  ],
  director: [MemberRole.VIDEO, MemberRole.SOUND],
  video: [],
  sound: [],
  moderation: [],
  treasury: [],
};

/**
 * Les roles qu'une personne peut attribuer, vu ses roles tenus.
 *
 * L'UNION, jamais un rang : une personne qui tient `coordination` ET
 * `treasury` peut attribuer ce que `coordination` permet. Le studio sert cette
 * liste MATERIALISEE — `studio-web` le demande explicitement plutot que la
 * table `grants` a recomposer.
 */
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
