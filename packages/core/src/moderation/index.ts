/**
 * La moderation : TROIS AXES separes, DEUX COMPTEURS, une preseance ecrite.
 *
 * D6 / E3 — quatre vocabulaires coexistaient pour une meme notion, et le
 * defaut de fond n'etait pas qu'ils divergent : c'est que `reported`, un etat
 * de TRIAGE, etait loge dans le champ des SANCTIONS. C'est pour cela que la
 * file se construisait en filtrant `state === 'reported'`, ce qui n'est pas un
 * filtre d'etat mais un filtre de nature.
 */

import { DomainError } from '../kernel/errors.js';
import type { Instant } from '../kernel/clock.js';
import { isAfter, plusMinutes } from '../time/instant.js';
import {
  AudienceSanction,
  MessageState,
  ModerationItemState,
  ModerationVerdict,
  StateChangeOrigin,
} from '../vocabulary/moderation.js';

/**
 * LA PASTILLE UNIQUE — derivee des trois axes, jamais recomposee par une
 * surface.
 *
 * Une seule pastille s'affiche a l'ecran ; il ne peut donc y avoir qu'un seul
 * proprietaire de la verite. La preseance, ecrite une fois :
 *
 *   banni  >  reduit au silence  >  retire  >  publie
 *
 * Elle va de la personne vers le message : une sanction sur la PERSONNE couvre
 * tous ses messages, alors qu'un retrait ne porte que sur un message.
 */
export const MODERATION_BADGES = ['badge-banned', 'badge-muted', 'badge-removed', 'badge-published'] as const;
export type ModerationBadge = (typeof MODERATION_BADGES)[number];

export const ModerationBadge = {
  BANNED: 'badge-banned',
  MUTED: 'badge-muted',
  REMOVED: 'badge-removed',
  PUBLISHED: 'badge-published',
} as const;

export function moderationBadgeOf(
  messageState: MessageState,
  authorSanction: AudienceSanction,
): ModerationBadge {
  if (authorSanction === AudienceSanction.BANNED) return ModerationBadge.BANNED;
  if (authorSanction === AudienceSanction.MUTED) return ModerationBadge.MUTED;
  if (messageState === MessageState.REMOVED) return ModerationBadge.REMOVED;
  return ModerationBadge.PUBLISHED;
}

/**
 * LE BAIL DE PRISE EN CHARGE — court, et il EXPIRE.
 *
 * « Prendre en charge n'est pas trancher. » Sans expiration, un moderateur qui
 * ferme son navigateur gele une ligne pendant tout le direct.
 */
export const CLAIM_LEASE_MINUTES = 3;

export function claimExpiryFrom(claimedAt: Instant): Instant {
  return plusMinutes(claimedAt, CLAIM_LEASE_MINUTES);
}

export function isClaimExpired(claimExpiresAt: Instant, now: Instant): boolean {
  return !isAfter(claimExpiresAt, now);
}

/**
 * LES DEUX COMPTEURS — et c'est la correction du C3 de `studio-mobile`.
 *
 * Demonstration sur les exemples du contrat lui-meme : `claim` puis `release`,
 * SANS RIEN TRANCHER, fait passer la version de 1 a 3. Un moderateur qui lit la
 * file a `version: 1`, perd le reseau et tranche voit donc son verdict REFUSE a
 * la reconnexion — alors que la file hors ligne est la seule concession
 * accordee au mobile, et que sur un direct a 60 messages par minute les lignes
 * changent de bail sans arret.
 *
 * Le fond est plus grave qu'un compteur mal place : la regle reelle est une
 * SUPERSESSION — « tant que le confrere n'a pas rendu de verdict, votre
 * sanction s'applique ». Un verdict doit donc etre ACCEPTE pendant qu'un autre
 * tient le bail.
 *
 *   ⚠ Un compteur unique ne peut pas exprimer
 *     « refuse si tranche, accepte si seulement reclame ».
 *
 * D'ou : `version` porte le BAIL, `decisionVersion` porte le REGLEMENT, et
 * SEUL un verdict l'incremente. Une commande de verdict est conditionnee sur le
 * second, jamais sur le premier.
 */
export interface ModerationItemSnapshot {
  readonly state: ModerationItemState;
  /** Incrementee par tout changement, bail compris. */
  readonly version: number;
  /** Incrementee par un VERDICT seulement. */
  readonly decisionVersion: number;
  readonly settledBy: string | null;
  readonly verdict: ModerationVerdict | null;
}

export interface SettlementAttempt {
  readonly expectedDecisionVersion: number;
  readonly verdict: ModerationVerdict;
  readonly origin: StateChangeOrigin;
}

export type SettlementOutcome =
  | { readonly accepted: true }
  | {
      readonly accepted: false;
      readonly code: string;
      /** Le verdict GAGNANT et son auteur, pour que l'ecran dise la verite. */
      readonly winner: { readonly verdict: ModerationVerdict; readonly settledBy: string } | null;
    };

/**
 * Un verdict est-il recevable ?
 *
 * Trois reponses, et la deuxieme est celle qui manquait partout :
 *   - la ligne est deja TRANCHEE  -> refus, AVEC le verdict gagnant et son
 *     auteur, pour que l'ecran affiche « X a deja supprime ce message » au lieu
 *     d'un echec nu. Un refus nu obligerait a un second aller-retour en plein
 *     direct ;
 *   - la ligne est seulement RECLAMEE par un confrere -> ACCEPTE. C'est la
 *     supersession, et c'est ce qu'un compteur unique refusait ;
 *   - le reglement a avance depuis la lecture -> refus.
 */
export function evaluateSettlement(
  snapshot: ModerationItemSnapshot,
  attempt: SettlementAttempt,
): SettlementOutcome {
  if (snapshot.state === ModerationItemState.SETTLED) {
    return {
      accepted: false,
      code: 'moderation.already_settled',
      winner:
        snapshot.verdict !== null && snapshot.settledBy !== null
          ? { verdict: snapshot.verdict, settledBy: snapshot.settledBy }
          : null,
    };
  }
  if (attempt.expectedDecisionVersion !== snapshot.decisionVersion) {
    return { accepted: false, code: 'moderation.decision_version_stale', winner: null };
  }
  return { accepted: true };
}

/**
 * LA PRESEANCE HUMAIN / AUTOMATIQUE, ecrite dans UN SEUL SENS.
 *
 * Un humain renverse une decision automatique ; **jamais l'inverse**. Sans
 * cette regle, un filtre retroactif effacerait un arbitrage rendu — et
 * l'arbitrage humain est precisement ce qu'on conserve 24 mois et qu'on
 * journalise nominativement.
 *
 * La moderation automatique n'est pas construite aujourd'hui. Cette fonction
 * existe pour que la forme puisse l'accueillir sans changement de contrat :
 * c'est bon marche maintenant, cher apres.
 */
export function canOverride(
  existingOrigin: StateChangeOrigin,
  incomingOrigin: StateChangeOrigin,
): boolean {
  const existingIsHuman = existingOrigin === StateChangeOrigin.HUMAN_VERDICT;
  const incomingIsHuman = incomingOrigin === StateChangeOrigin.HUMAN_VERDICT;
  if (existingIsHuman && !incomingIsHuman) return false;
  return true;
}

export function assertCanOverride(
  existingOrigin: StateChangeOrigin,
  incomingOrigin: StateChangeOrigin,
): void {
  if (!canOverride(existingOrigin, incomingOrigin)) {
    throw new DomainError({
      code: 'moderation.automatic_cannot_override_human',
      params: { existing: existingOrigin, incoming: incomingOrigin },
    });
  }
}

/**
 * Le DEBIT du tchat, mesure dans une unite DECLAREE.
 *
 * `studio-mobile` (incoherence 6) : la maquette calcule `messages / heures
 * ecoulees` et l'etiquette « MSG/MIN », puis le compare a un seuil de
 * 60 msg/min. Ce ne sont pas les memes grandeurs. Le contrat fixe donc la
 * fenetre, l'unite et la frequence.
 */
export const CHAT_RATE_WINDOW_SECONDS = 60;
export const CHAT_BURST_THRESHOLD_PER_MINUTE = 60;

export function chatRatePerMinute(messagesInWindow: number): number {
  return Math.round((messagesInWindow / CHAT_RATE_WINDOW_SECONDS) * 60);
}

/** Au-dela du seuil, la console cesse d'afficher le tchat message par message. */
export function shouldCollapseToQueue(messagesInWindow: number): boolean {
  return chatRatePerMinute(messagesInWindow) >= CHAT_BURST_THRESHOLD_PER_MINUTE;
}

/** Une sanction porte un INSTANT d'expiration, jamais une etiquette. */
export function sanctionExpiryFrom(sanctionedAt: Instant, durationMinutes: number | null): Instant | null {
  return durationMinutes === null ? null : plusMinutes(sanctionedAt, durationMinutes);
}

export function isSanctionActive(expiresAt: Instant | null, now: Instant): boolean {
  return expiresAt === null || isAfter(expiresAt, now);
}
