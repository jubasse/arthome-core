import { describe, expect, it } from 'vitest';

import { MemberRole, NavigationEntry } from '../vocabulary/people.js';
import { assignableRolesOf } from './grants.js';
import { canDecide, canRevenue, effectiveRightsOf } from './rights.js';

/**
 * INVARIANT PROTEGE
 *   Le repli des huit roles sur six personas ne cree JAMAIS un droit.
 *
 * POURQUOI CE TEST EXISTE
 *   E6 : `studio-data.js` ecrase `director`, `video` et `sound` en un seul
 *   « regie ». Or `grants` les distingue — `director` peut inviter `video` et
 *   `sound`, les deux autres ne peuvent inviter personne. Autoriser sur le role
 *   court accorde a un regisseur son un droit d'invitation qu'il n'a pas.
 *
 *   Le cas qui fait mal est celui d'une personne qui tient DEUX roles, parce
 *   que c'est la que la tentation d'un « rang » revient.
 */
describe('les roles attribuables', () => {
  it("n'accorde rien a `video` ni a `sound`", () => {
    expect(assignableRolesOf([MemberRole.VIDEO])).toEqual([]);
    expect(assignableRolesOf([MemberRole.SOUND])).toEqual([]);
    expect(assignableRolesOf([MemberRole.MODERATION])).toEqual([]);
  });

  it('accorde a `director` exactement `video` et `sound`', () => {
    expect([...assignableRolesOf([MemberRole.DIRECTOR])].sort()).toEqual(['sound', 'video']);
  });

  it('rend VIDE pour une personne qui tient `video` ET `moderation`', () => {
    // Le cas du repli : rabattus sur « regie » et « mod », ces deux roles
    // sembleraient donner quelque chose. Ils ne donnent rien.
    expect(assignableRolesOf([MemberRole.VIDEO, MemberRole.MODERATION])).toEqual([]);
  });

  it("fait l'UNION des roles tenus, jamais un maximum", () => {
    const union = assignableRolesOf([MemberRole.DIRECTOR, MemberRole.COORDINATION]);
    // `coordination` apporte `director` et `moderation` ; `director` apporte
    // `video` et `sound`. L'union des deux, sans doublon.
    expect([...union].sort()).toEqual(['director', 'moderation', 'sound', 'video']);
  });
});

/**
 * INVARIANT PROTEGE
 *   L'acces est l'UNION des roles tenus, jamais un rang.
 *
 * POURQUOI
 *   C'est la regle que la barre d'onglets du studio mobile applique, et elle
 *   est arithmetique : il n'y a pas de role « superieur ». Une personne qui
 *   tient `moderation` et `treasury` ouvre la reunion des deux menus, qui n'est
 *   celui d'aucun des deux.
 */
describe('les droits effectifs', () => {
  it("ouvre la reunion des deux menus, qui n'est celui d'aucun des deux", () => {
    const rights = effectiveRightsOf([MemberRole.MODERATION, MemberRole.TREASURY]);
    expect(rights.navigation).toContain(NavigationEntry.MODERATION); // du moderateur
    expect(rights.navigation).toContain(NavigationEntry.PAYOUTS); // du tresorier
    expect(rights.navigation).toContain(NavigationEntry.AGENDA); // du moderateur
  });

  it('ne duplique pas une entree partagee par deux roles', () => {
    const rights = effectiveRightsOf([MemberRole.VIDEO, MemberRole.SOUND]);
    const streams = rights.navigation.filter((entry) => entry === NavigationEntry.STREAM);
    expect(streams).toHaveLength(1);
  });
});

/**
 * INVARIANT PROTEGE
 *   `canRevenue` decide de CE QUE LA REPONSE CONTIENT, pas de son affichage.
 *
 * POURQUOI
 *   Une regie qui recevrait le brut de billetterie et ne l'afficherait pas est
 *   une FUITE : la charge utile est en clair dans un WebView, inspectable, et
 *   elle survit dans le cache HTTP du telephone.
 */
describe('les trois capacites transverses', () => {
  it('donne la recette a artist, production et treasury — a eux seuls', () => {
    expect(canRevenue([MemberRole.ARTIST])).toBe(true);
    expect(canRevenue([MemberRole.PRODUCTION])).toBe(true);
    expect(canRevenue([MemberRole.TREASURY])).toBe(true);
    expect(canRevenue([MemberRole.DIRECTOR])).toBe(false);
    expect(canRevenue([MemberRole.COORDINATION])).toBe(false);
    expect(canRevenue([MemberRole.MODERATION])).toBe(false);
  });

  it('reserve la decision d\'issue au proprietaire et a la production', () => {
    // Reporter, annuler, dedommager : les autres ne peuvent que SIGNALER.
    expect(canDecide([MemberRole.ARTIST])).toBe(true);
    expect(canDecide([MemberRole.PRODUCTION])).toBe(true);
    expect(canDecide([MemberRole.TREASURY])).toBe(false);
    expect(canDecide([MemberRole.DIRECTOR, MemberRole.COORDINATION])).toBe(false);
  });

  it('ne donne rien a une personne sans role', () => {
    const rights = effectiveRightsOf([]);
    expect(rights.navigation).toEqual([]);
    expect(rights.openPanes).toEqual([]);
    expect(rights.canRevenue).toBe(false);
    expect(rights.canDecide).toBe(false);
  });
});
