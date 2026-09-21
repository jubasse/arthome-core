import { describe, expect, it } from 'vitest';

import {
  AudienceSanction,
  MessageState,
  ModerationItemState,
  ModerationVerdict,
  StateChangeOrigin,
} from '../vocabulary/moderation.js';
import {
  ModerationBadge,
  canOverride,
  evaluateSettlement,
  moderationBadgeOf,
  shouldCollapseToQueue,
  type ModerationItemSnapshot,
} from './index.js';

/**
 * INVARIANT PROTEGE
 *   Un verdict est ACCEPTE pendant qu'un confrere tient le bail, et REFUSE
 *   seulement si la ligne est deja tranchee — avec le verdict gagnant.
 *
 * POURQUOI CE TEST EXISTE
 *   C3 de `studio-mobile`, demontre sur les exemples du contrat : `claim` puis
 *   `release` SANS RIEN TRANCHER fait passer la version de 1 a 3. Un moderateur
 *   qui lit la file a `version: 1`, perd le reseau et tranche voit son verdict
 *   REFUSE a la reconnexion — alors que la file hors ligne est la seule
 *   concession accordee au mobile.
 *
 *   La regle reelle est une SUPERSESSION : « tant que le confrere n'a pas rendu
 *   de verdict, votre sanction s'applique ». Un compteur unique ne peut pas
 *   exprimer « refuse si tranche, accepte si seulement reclame ».
 */
describe('les deux compteurs de moderation', () => {
  const claimed: ModerationItemSnapshot = {
    state: ModerationItemState.CLAIMED,
    version: 3, // un confrere a pris puis relache : la version a bouge
    decisionVersion: 0, // mais RIEN n'a ete tranche
    settledBy: null,
    verdict: null,
  };

  it('accepte un verdict hors ligne malgre un bail pris entre-temps', () => {
    // Le cas exact du defaut : la version a bouge de 1 a 3 sans verdict.
    const outcome = evaluateSettlement(claimed, {
      expectedDecisionVersion: 0,
      verdict: ModerationVerdict.REMOVE,
      origin: StateChangeOrigin.HUMAN_VERDICT,
    });

    expect(outcome.accepted).toBe(true);
  });

  it('refuse un second verdict ET transporte le gagnant', () => {
    // Un refus nu obligerait a un second aller-retour en plein direct. L'ecran
    // doit pouvoir dire « X a deja supprime ce message ».
    const settled: ModerationItemSnapshot = {
      state: ModerationItemState.SETTLED,
      version: 5,
      decisionVersion: 1,
      settledBy: 'person:ana',
      verdict: ModerationVerdict.REMOVE,
    };

    const outcome = evaluateSettlement(settled, {
      expectedDecisionVersion: 0,
      verdict: ModerationVerdict.PUBLISH,
      origin: StateChangeOrigin.HUMAN_VERDICT,
    });

    expect(outcome).toEqual({
      accepted: false,
      code: 'moderation.already_settled',
      winner: { verdict: ModerationVerdict.REMOVE, settledBy: 'person:ana' },
    });
  });

  it('refuse quand le reglement a avance depuis la lecture', () => {
    const advanced: ModerationItemSnapshot = { ...claimed, decisionVersion: 2 };
    const outcome = evaluateSettlement(advanced, {
      expectedDecisionVersion: 0,
      verdict: ModerationVerdict.REMOVE,
      origin: StateChangeOrigin.HUMAN_VERDICT,
    });

    expect(outcome.accepted).toBe(false);
  });
});

/**
 * INVARIANT PROTEGE
 *   Un humain renverse une decision automatique ; JAMAIS l'inverse.
 *
 * POURQUOI
 *   Sans cette regle, un filtre retroactif effacerait un arbitrage rendu — et
 *   l'arbitrage humain est precisement ce qu'on conserve 24 mois et qu'on
 *   journalise nominativement. Rien n'est construit aujourd'hui : la forme doit
 *   pouvoir accueillir un acteur non humain sans changement de contrat.
 */
describe('la preseance humain / automatique', () => {
  it('laisse un humain renverser une decision automatique', () => {
    expect(canOverride(StateChangeOrigin.AUTOMATIC_FILTER, StateChangeOrigin.HUMAN_VERDICT)).toBe(true);
    expect(canOverride(StateChangeOrigin.RETROACTIVE_FILTER, StateChangeOrigin.HUMAN_VERDICT)).toBe(true);
  });

  it("interdit a l'automatique de renverser un humain", () => {
    expect(canOverride(StateChangeOrigin.HUMAN_VERDICT, StateChangeOrigin.AUTOMATIC_FILTER)).toBe(false);
    expect(canOverride(StateChangeOrigin.HUMAN_VERDICT, StateChangeOrigin.RETROACTIVE_FILTER)).toBe(false);
  });

  it('laisse un humain revenir sur un humain', () => {
    expect(canOverride(StateChangeOrigin.HUMAN_VERDICT, StateChangeOrigin.HUMAN_VERDICT)).toBe(true);
  });
});

/**
 * INVARIANT PROTEGE
 *   Une seule pastille s'affiche, et la preseance va de la PERSONNE vers le
 *   MESSAGE.
 */
describe('la pastille unique', () => {
  it('fait primer la sanction de la personne sur l\'etat du message', () => {
    expect(moderationBadgeOf(MessageState.PUBLISHED, AudienceSanction.BANNED)).toBe(ModerationBadge.BANNED);
    expect(moderationBadgeOf(MessageState.REMOVED, AudienceSanction.MUTED)).toBe(ModerationBadge.MUTED);
    expect(moderationBadgeOf(MessageState.REMOVED, AudienceSanction.NONE)).toBe(ModerationBadge.REMOVED);
    expect(moderationBadgeOf(MessageState.PUBLISHED, AudienceSanction.NONE)).toBe(ModerationBadge.PUBLISHED);
  });
});

/**
 * INVARIANT PROTEGE
 *   Le debit du tchat est mesure dans une unite DECLAREE.
 *
 * POURQUOI
 *   La maquette calcule `messages / heures ecoulees` et l'etiquette
 *   « MSG/MIN », puis le compare a un seuil de 60 msg/min. Ce ne sont pas les
 *   memes grandeurs, et l'ecart est d'un facteur soixante.
 */
describe('le debit du tchat', () => {
  it('bascule sur la file au-dela du seuil, pas avant', () => {
    expect(shouldCollapseToQueue(59)).toBe(false);
    expect(shouldCollapseToQueue(60)).toBe(true);
  });
});
