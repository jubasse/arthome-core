/**
 * Les DROITS EFFECTIFS — calcules UNE FOIS ici, servis par le BFF studio.
 *
 * `studio-web` Q1 posait la question et sa position est retenue : le contrat
 * sert LES DEUX — la matiere brute au vocabulaire a huit roles, et les droits
 * effectifs calcules. Sans quoi le studio web, le studio mobile et les gardes
 * de chaque service liraient la meme table trois fois.
 *
 * ⚠ L'ACCES EST L'UNION DES ROLES, JAMAIS UN RANG. Une personne qui tient
 * `video` et `moderation` sur la meme chaine ouvre la reunion des deux. C'est
 * la regle que la barre d'onglets du studio mobile applique, et elle est
 * arithmetique : il n'y a pas de role « superieur ».
 */

import { DatePane, MemberRole, NavigationEntry } from '../vocabulary/people.js';
import { assignableRolesOf } from './grants.js';

const NAVIGATION: Readonly<Record<MemberRole, readonly NavigationEntry[]>> = {
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

const PANES: Readonly<Record<MemberRole, readonly DatePane[]>> = {
  artist: [DatePane.PUBLIC, DatePane.TICKETS, DatePane.CHAT, DatePane.TECH, DatePane.CREW, DatePane.REPLAY],
  production: [DatePane.PUBLIC, DatePane.TICKETS, DatePane.CHAT, DatePane.TECH, DatePane.CREW, DatePane.REPLAY],
  coordination: [DatePane.TECH, DatePane.CREW],
  director: [DatePane.TECH],
  video: [DatePane.TECH],
  sound: [DatePane.TECH],
  moderation: [DatePane.CHAT],
  treasury: [DatePane.TICKETS],
};

/** `canRevenue` = artist ∨ production ∨ treasury. */
const REVENUE_ROLES: readonly MemberRole[] = [
  MemberRole.ARTIST,
  MemberRole.PRODUCTION,
  MemberRole.TREASURY,
];

/** `canDecide` = artist ∨ production. Les gestes qui engagent les acheteurs. */
const DECIDE_ROLES: readonly MemberRole[] = [MemberRole.ARTIST, MemberRole.PRODUCTION];

/** `canOps` = artist ∨ production ∨ les trois postes de regie. */
const OPS_ROLES: readonly MemberRole[] = [
  MemberRole.ARTIST,
  MemberRole.PRODUCTION,
  MemberRole.DIRECTOR,
  MemberRole.VIDEO,
  MemberRole.SOUND,
];

function unionOf<T>(
  table: Readonly<Record<MemberRole, readonly T[]>>,
  heldRoles: readonly MemberRole[],
): readonly T[] {
  const union = new Set<T>();
  for (const role of heldRoles) {
    for (const entry of table[role]) union.add(entry);
  }
  return [...union];
}

/**
 * `canRevenue` ne masque pas une colonne : IL DECIDE DE CE QUE LA REPONSE
 * CONTIENT.
 *
 * Une regie qui recevrait le brut de billetterie dans sa charge utile et ne
 * l'afficherait pas est une FUITE, pas une regle — la charge utile est en clair
 * dans un WebView, inspectable, et elle survit dans le cache HTTP du telephone
 * (`studio-mobile` §3). Corollaire porte par le contrat : une cle de tri sur un
 * champ absent est REFUSEE, jamais ignoree.
 */
export function canRevenue(heldRoles: readonly MemberRole[]): boolean {
  return heldRoles.some((role) => REVENUE_ROLES.includes(role));
}

export function canDecide(heldRoles: readonly MemberRole[]): boolean {
  return heldRoles.some((role) => DECIDE_ROLES.includes(role));
}

export function canOps(heldRoles: readonly MemberRole[]): boolean {
  return heldRoles.some((role) => OPS_ROLES.includes(role));
}

export interface EffectiveRights {
  readonly navigation: readonly NavigationEntry[];
  readonly openPanes: readonly DatePane[];
  readonly assignableRoles: readonly MemberRole[];
  readonly canRevenue: boolean;
  readonly canDecide: boolean;
  readonly canOps: boolean;
}

/**
 * Les droits effectifs d'une personne SUR UNE CHAINE.
 *
 * ⚠ SUR UNE CHAINE, et c'est un invariant, pas une commodite. Les regisseurs et
 * les moderateurs ne sont pas des salaries : ce sont des collaborateurs des
 * artistes ou des independants qui travaillent sur plusieurs chaines. Un droit
 * verifie sur « l'appartenance a une chaine quelconque » laisserait un
 * independant lire la file de moderation, les pseudonymes et l'historique des
 * spectateurs d'une chaine qui n'est pas la sienne — ce n'est pas un defaut
 * d'ergonomie, c'est un defaut de PROTECTION DES DONNEES.
 */
export function effectiveRightsOf(heldRoles: readonly MemberRole[]): EffectiveRights {
  return {
    navigation: unionOf(NAVIGATION, heldRoles),
    openPanes: unionOf(PANES, heldRoles),
    assignableRoles: assignableRolesOf(heldRoles),
    canRevenue: canRevenue(heldRoles),
    canDecide: canDecide(heldRoles),
    canOps: canOps(heldRoles),
  };
}
