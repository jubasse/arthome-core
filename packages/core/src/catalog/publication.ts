/**
 * La machine a etats d'une publication, et ses deux passages SANS RETOUR.
 *
 * E5 — la correction la plus discrete et la plus importante : les fixtures
 * encodent `lockedTransitions: ['scheduled', 'replay-online']`, une liste
 * d'ETATS, et testent l'appartenance de l'etat courant. La maquette encode des
 * COUPLES `from>to`. Ce sont deux semantiques differentes, et c'est la seconde
 * qui est juste — verrouiller un ETAT empecherait aussi d'y entrer.
 *
 * Et une garantie que l'interface ne donne pas : **le serveur refuse la
 * transition inverse**. Ne pas l'offrir dans l'ecran est une politesse, pas une
 * garantie.
 */

import { DomainError } from '../kernel/errors.js';
import { PublicationState } from '../vocabulary/catalog.js';

/** Une transition offerte, avec ce qu'elle engage. */
export interface PublicationTransition {
  readonly from: PublicationState;
  readonly to: PublicationState;
  /**
   * Le CODE de la promesse engagee, servi avec le refus pour que le message
   * soit traduit cote client. Nul quand la transition est reversible.
   */
  readonly irreversiblePromiseCode: string | null;
}

/**
 * La table, ecrite une fois. Deux couples sont sans retour :
 *   `draft|reserve -> scheduled`  — la publication engage LE TARIF AFFICHE ;
 *   `ended -> replay-online`      — des spectateurs ont PAYE pour la rediffusion.
 *
 * ⚠ `technical -> live` et `live -> ended` ne sont PAS des commandes : elles
 * sont CAUSEES par `streaming.run.started.v1` et `streaming.run.ended.v1`.
 * C'est ce qui laisse `Publication` agregat d'un seul contexte, alors qu'elle
 * semblait a cheval sur trois. La commande « passer a l'antenne » va a
 * `streaming`, qui seul sait si le flux entre.
 */
const TRANSITIONS: readonly PublicationTransition[] = [
  { from: PublicationState.DRAFT, to: PublicationState.RESERVE, irreversiblePromiseCode: null },
  { from: PublicationState.RESERVE, to: PublicationState.DRAFT, irreversiblePromiseCode: null },
  {
    from: PublicationState.DRAFT,
    to: PublicationState.SCHEDULED,
    irreversiblePromiseCode: 'publication.promise.prices_engaged',
  },
  {
    from: PublicationState.RESERVE,
    to: PublicationState.SCHEDULED,
    irreversiblePromiseCode: 'publication.promise.prices_engaged',
  },
  { from: PublicationState.SCHEDULED, to: PublicationState.TECHNICAL, irreversiblePromiseCode: null },
  { from: PublicationState.TECHNICAL, to: PublicationState.SCHEDULED, irreversiblePromiseCode: null },
  {
    from: PublicationState.ENDED,
    to: PublicationState.REPLAY_ONLINE,
    irreversiblePromiseCode: 'publication.promise.replay_on_sale',
  },
];

/** Les transitions causees par un evenement, jamais par une commande studio. */
const EVENT_DRIVEN: readonly PublicationTransition[] = [
  { from: PublicationState.TECHNICAL, to: PublicationState.LIVE, irreversiblePromiseCode: null },
  { from: PublicationState.LIVE, to: PublicationState.ENDED, irreversiblePromiseCode: null },
];

/**
 * Le RANG d'un etat, servi avec lui.
 *
 * Le tableau des evenements du studio trie PAR ETAT, et l'ordre est celui de la
 * machine, pas l'ordre alphabetique. Sans rang servi, chaque surface
 * reinventerait `STATE_ORDER` — `studio-web` Q5.
 */
const ORDER: readonly PublicationState[] = [
  PublicationState.DRAFT,
  PublicationState.RESERVE,
  PublicationState.SCHEDULED,
  PublicationState.TECHNICAL,
  PublicationState.LIVE,
  PublicationState.ENDED,
  PublicationState.REPLAY_ONLINE,
];

export function orderRankOf(state: PublicationState): number {
  return ORDER.indexOf(state);
}

/**
 * Les transitions offertes A CET OPERATEUR.
 *
 * `canDecide` (artist ∨ production) est un ARGUMENT : seuls le proprietaire et
 * la production deplacent une date ; une regie voit la fiche et ne la deplace
 * pas. Servir la liste evite que chaque surface recalcule la table — et c'est
 * aussi ce qui permet au correctif temps reel de porter les transitions du
 * DESTINATAIRE, sans quoi un bouton perime resterait affiche (`realtime.md` §3.3).
 */
export function nextPublicationTransitions(
  from: PublicationState,
  canDecide: boolean,
): readonly PublicationTransition[] {
  if (!canDecide) return [];
  return TRANSITIONS.filter((transition) => transition.from === from);
}

/** Cette transition est-elle causee par un evenement plutot que commandee ? */
export function isEventDriven(from: PublicationState, to: PublicationState): boolean {
  return EVENT_DRIVEN.some((transition) => transition.from === from && transition.to === to);
}

/**
 * Le verrou porte sur le COUPLE, jamais sur l'etat.
 *
 * Rend le code de la promesse engagee quand la transition inverse est refusee,
 * `null` quand elle est simplement inconnue — deux refus differents, deux
 * messages differents.
 */
export function irreversiblePromiseBlocking(
  from: PublicationState,
  to: PublicationState,
): string | null {
  const reverse = TRANSITIONS.find(
    (transition) => transition.from === to && transition.to === from,
  );
  return reverse?.irreversiblePromiseCode ?? null;
}

export function assertTransitionAllowed(
  from: PublicationState,
  to: PublicationState,
  canDecide: boolean,
): void {
  const promise = irreversiblePromiseBlocking(from, to);
  if (promise !== null) {
    throw new DomainError({
      code: 'publication.transition_irreversible',
      params: { from, to, promise },
    });
  }
  const allowed = nextPublicationTransitions(from, canDecide);
  if (!allowed.some((transition) => transition.to === to)) {
    throw new DomainError({ code: 'publication.transition_forbidden', params: { from, to } });
  }
}

/**
 * LA LISTE DE CONTROLE QUI FAIT FOI : SEPT elements, ceux de la fiche.
 *
 * `studio-web` Q7 : les fixtures en portent QUATRE, la fiche en affiche SEPT,
 * et les deux repondent a la meme question. Les quatre sont un sous-ensemble
 * arbitraire ; les sept sont ceux qu'un ecran a reellement exerces.
 *
 * ⚠ TROIS des sept sont des FAITS PROJETES depuis d'autres contextes —
 * `at_least_one_active_price` et `capacity` viennent de `ticketing`,
 * `technical_check_passed` de `streaming`. `catalog` les tient a jour par
 * evenement et ne les demande a personne : c'est ce qui evite qu'une
 * publication ait besoin d'un appel synchrone vers deux services.
 */
export const PUBLICATION_CHECKLIST_ITEMS = [
  'title-and-discipline',
  'poster',
  'description',
  'at-least-one-active-price',
  'capacity',
  'technical-check-passed',
  'chat-mode-set',
] as const;
export type PublicationChecklistItem = (typeof PUBLICATION_CHECKLIST_ITEMS)[number];

/**
 * Les avertissements NON BLOQUANTS.
 *
 * « Chapitres prevus » et « moderateur affecte » quittent la liste bloquante :
 * on doit pouvoir publier une date sans chapitres, et un poste non affecte se
 * rattrape jusqu'au dernier jour.
 */
export const PUBLICATION_WARNING_ITEMS = ['chapters-planned', 'moderator-assigned'] as const;
export type PublicationWarningItem = (typeof PUBLICATION_WARNING_ITEMS)[number];

export interface PublicationReadiness {
  readonly ready: boolean;
  /** Les identifiants MANQUANTS — jamais un pourcentage, que le client calcule. */
  readonly missing: readonly PublicationChecklistItem[];
  readonly warnings: readonly PublicationWarningItem[];
}

export function publicationReadiness(
  satisfied: readonly PublicationChecklistItem[],
  satisfiedWarnings: readonly PublicationWarningItem[],
): PublicationReadiness {
  const missing = PUBLICATION_CHECKLIST_ITEMS.filter((item) => !satisfied.includes(item));
  const warnings = PUBLICATION_WARNING_ITEMS.filter((item) => !satisfiedWarnings.includes(item));
  return { ready: missing.length === 0, missing, warnings };
}
