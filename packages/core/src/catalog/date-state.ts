/**
 * `displayStateOf` — LA valeur que les cartes affichent, et la seule.
 *
 * E4 : trois axes d'etat coexistaient sur une date sans hierarchie ecrite —
 * `publication.state` (sept valeurs), `run.state` (six) et `outcome` (trois) —
 * et AUCUN ne portait l'etat affiche. Chaque surface recomposait la hierarchie
 * a sa facon : la definition meme d'une valeur calculee deux fois.
 *
 * La hierarchie, ecrite une fois :
 *
 *   outcome  PRIME SUR  run.state  PRIME SUR  publication.state  PRIME SUR  le temps
 *
 * Et la regle qui rend tout cela licite (`context-map.md` §0) : une regle vit
 * une fois ici et s'evalue partout. Ce qui est interdit, ce sont deux
 * IMPLEMENTATIONS, jamais deux APPELS. Le serveur evalue au service et sert
 * `validUntil` ; la surface reevalue LA MEME FONCTION quand cet instant passe.
 */

import type { Instant } from '../kernel/clock.js';
import { isAfter, isBefore, minutesBetween, plusHours, plusMinutes } from '../time/instant.js';
// Chaque nom porte ses DEUX sens : le type (l'union des valeurs) et l'objet de
// membres nommes. Un seul import suffit, et une regle n'ecrit jamais une
// chaine litterale — c'est ce qui rend `arthome-check-enums` tenable a l'usage.
import {
  DateOutcome,
  DisplayState,
  PublicationState,
  ReplayPolicy,
  RunState,
} from '../vocabulary/catalog.js';

/**
 * Les BORNES d'une date — ce que le contrat sert a cote de l'etat.
 *
 * D7 : `shared/` porte `startOffsetMin`, un decalage relatif a l'ouverture de
 * l'application, et `catalogue.json` le dit lui-meme — « nothing here
 * expires ». Ici, des instants.
 */
export interface DateTiming {
  readonly startsAt: Instant;
  readonly runtimeMin: number;
  /**
   * 30 minutes aujourd'hui — et c'est une CONSTANTE DE DOMAINE SERVIE, pas un
   * littéral recopie dans cinq surfaces (E11). La maquette TV la recopiait dans
   * plusieurs libelles.
   */
  readonly roomOpensBeforeMin: number;
  readonly replayPolicy: ReplayPolicy;
  readonly replayWindowHours: number;
}

export interface DisplayStateInput {
  readonly publicationState: PublicationState;
  readonly runState: RunState | null;
  readonly outcome: DateOutcome | null;
  readonly timing: DateTiming;
  readonly now: Instant;
}

export interface DisplayStateResult {
  readonly state: DisplayState;
  /**
   * L'instant ou cet etat CESSE d'etre vrai — `null` quand seul un evenement
   * peut le changer (une issue est un fait ; un brouillon attend une commande).
   *
   * C'est ce qui reconcilie « aucune valeur calculee deux fois » avec « une
   * reponse doit rester juste huit heures apres avoir ete mise en cache ».
   * Sans lui, une application reveillee affiche des etats faux ET NE SAIT PAS
   * QU'ILS LE SONT.
   */
  readonly validUntil: Instant | null;
}

export function roomOpensAt(timing: DateTiming): Instant {
  return plusMinutes(timing.startsAt, -timing.roomOpensBeforeMin);
}

export function endsAt(timing: DateTiming): Instant {
  return plusMinutes(timing.startsAt, timing.runtimeMin);
}

/**
 * La fin de la fenetre de rediffusion, ou `null` quand il n'y en a pas.
 *
 * Elle court depuis la FIN du direct, jamais depuis le debut. E2 : la maquette
 * mobile emploie `sub` et `off` la ou le vocabulaire dit `subscription` et
 * `none`, et `helpers.stateOf` testait litteralement `policy !== 'none'` —
 * une date creee avec `off` n'aurait JAMAIS ete reconnue comme sans
 * rediffusion. Ici, le vocabulaire est ferme et typé : la faute est
 * impossible.
 */
export function replayEndsAt(timing: DateTiming): Instant | null {
  if (timing.replayPolicy === ReplayPolicy.NONE || timing.replayWindowHours <= 0) return null;
  return plusHours(endsAt(timing), timing.replayWindowHours);
}

/** La salle est-elle ouverte ? Bornes : `[startsAt - 30 min, startsAt)`. */
export function isRoomOpen(timing: DateTiming, now: Instant): boolean {
  return !isBefore(now, roomOpensAt(timing)) && isBefore(now, timing.startsAt);
}

/** La progression d'un direct, bornee a `[0, 1]`. */
export function progressOf(timing: DateTiming, now: Instant): number {
  if (timing.runtimeMin <= 0) return 0;
  const elapsed = minutesBetween(timing.startsAt, now);
  return Math.min(1, Math.max(0, elapsed / timing.runtimeMin));
}

/** L'issue, traduite en etat affiche. Elle REMPLACE tout le reste. */
function outcomeDisplay(outcome: DateOutcome): DisplayState {
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
 * Les etats de publication qui ne sont pas encore publics : l'etat affiche EST
 * l'etat de publication.
 *
 * Le studio affiche ces dates-la, et `displayState` est prescrit sur LES DEUX
 * produits — le studio d'abord, puisque c'est lui qui a trois axes a
 * reconcilier.
 */
function preSaleDisplay(state: PublicationState): DisplayState | null {
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

export function displayStateOf(input: DisplayStateInput): DisplayStateResult {
  const { publicationState, runState, outcome, timing, now } = input;

  // 1. L'ISSUE PRIME SUR TOUT. Et elle n'expire jamais : c'est un fait.
  if (outcome !== null) {
    return { state: outcomeDisplay(outcome), validUntil: null };
  }

  // 2. L'ANTENNE prime sur le temps — la regie peut passer a l'antenne avant
  //    l'heure annoncee, et c'est elle qui fait foi.
  //    `interrupted` reste LIVE : `streaming.md` pose que l'ecran d'attente est
  //    un VOILE pose par-dessus une video intacte, jamais une bascule. Tant
  //    qu'aucune issue n'est declaree, le spectacle peut reprendre.
  if (runState === RunState.ON_AIR || runState === RunState.INTERRUPTED) {
    return { state: DisplayState.LIVE, validUntil: endsAt(timing) };
  }

  // 3. Les etats non publics : la pastille EST l'etat de publication, et seule
  //    une commande la change.
  const preSale = preSaleDisplay(publicationState);
  if (preSale !== null) {
    return { state: preSale, validUntil: null };
  }

  // 4. Le TEMPS, en dernier — et c'est lui qui porte les `validUntil` utiles.
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
 * La date est-elle derriere nous, rediffusion comprise ?
 *
 * Sert au tri de « Mes places » : a l'antenne et salle ouverte d'abord, puis a
 * venir, puis rediffusions disponibles, puis issues fermees, puis passees.
 * Cet ordre est une REGLE DU DOMAINE (`storefront-tv`, `TicketCard`), pas une
 * preference d'ecran.
 */
export function isFullyOver(timing: DateTiming, now: Instant): boolean {
  const replayUntil = replayEndsAt(timing);
  return isAfter(now, replayUntil ?? endsAt(timing));
}
