import { describe, expect, it } from 'vitest';

import { PublicationState } from '../vocabulary/catalog.js';
import {
  PUBLICATION_CHECKLIST_ITEMS,
  assertTransitionAllowed,
  irreversiblePromiseBlocking,
  isEventDriven,
  nextPublicationTransitions,
  orderRankOf,
  publicationReadiness,
} from './publication.js';

/**
 * INVARIANT PROTEGE
 *   Le verrou porte sur le COUPLE `from > to`, jamais sur l'ETAT.
 *
 * POURQUOI CE TEST EXISTE
 *   E5 : les fixtures encodent `lockedTransitions: ['scheduled',
 *   'replay-online']` — une liste d'ETATS — et testent l'appartenance de l'etat
 *   courant. La maquette encode des couples. Ce sont deux semantiques, et la
 *   difference n'est pas academique : verrouiller un ETAT empecherait aussi d'y
 *   ENTRER. Une date ne pourrait jamais etre publiee.
 */
describe('le verrou porte sur la transition', () => {
  it('laisse ENTRER dans un etat verrouille', () => {
    // C'est le cas que la semantique des fixtures aurait casse.
    expect(() =>
      assertTransitionAllowed(PublicationState.DRAFT, PublicationState.SCHEDULED, true),
    ).not.toThrow();
  });

  it("refuse d'en SORTIR, avec la promesse engagee", () => {
    expect(irreversiblePromiseBlocking(PublicationState.SCHEDULED, PublicationState.DRAFT)).toBe(
      'publication.promise.prices_engaged',
    );
    expect(irreversiblePromiseBlocking(PublicationState.REPLAY_ONLINE, PublicationState.ENDED)).toBe(
      'publication.promise.replay_on_sale',
    );
  });

  it('distingue « sans retour » de « inconnue » — deux refus, deux messages', () => {
    // Revenir sur un tarif engage n'est pas la meme chose que tenter une
    // transition qui n'existe pas. Le premier merite une explication.
    expect(irreversiblePromiseBlocking(PublicationState.RESERVE, PublicationState.DRAFT)).toBeNull();
    expect(() => assertTransitionAllowed(PublicationState.DRAFT, PublicationState.LIVE, true)).toThrow();
  });

  it('laisse aller et revenir entre brouillon et reserve', () => {
    expect(() => assertTransitionAllowed(PublicationState.DRAFT, PublicationState.RESERVE, true)).not.toThrow();
    expect(() => assertTransitionAllowed(PublicationState.RESERVE, PublicationState.DRAFT, true)).not.toThrow();
  });
});

/**
 * INVARIANT PROTEGE
 *   Deux transitions ne sont pas des commandes : elles sont CAUSEES par un
 *   evenement de `streaming`.
 *
 * POURQUOI
 *   C'est ce qui laisse `Publication` agregat d'un SEUL contexte, alors qu'elle
 *   semblait a cheval sur trois. La commande « passer a l'antenne » va a
 *   `streaming`, qui seul sait si le flux entre — `catalog` l'APPREND.
 */
describe('ce que le studio ne commande pas', () => {
  it("n'offre jamais `technical -> live` ni `live -> ended` a un operateur", () => {
    const fromTechnical = nextPublicationTransitions(PublicationState.TECHNICAL, true);
    expect(fromTechnical.map((t) => t.to)).not.toContain(PublicationState.LIVE);

    const fromLive = nextPublicationTransitions(PublicationState.LIVE, true);
    expect(fromLive).toEqual([]);
  });

  it('les reconnait comme causees par un evenement', () => {
    expect(isEventDriven(PublicationState.TECHNICAL, PublicationState.LIVE)).toBe(true);
    expect(isEventDriven(PublicationState.LIVE, PublicationState.ENDED)).toBe(true);
    expect(isEventDriven(PublicationState.DRAFT, PublicationState.SCHEDULED)).toBe(false);
  });
});

/**
 * INVARIANT PROTEGE
 *   Les transitions offertes sont calculees POUR CET OPERATEUR.
 *
 * POURQUOI
 *   Seuls le proprietaire et la production deplacent une date ; une regie voit
 *   la fiche et ne la deplace pas. Et c'est ce qui permet au correctif temps
 *   reel de porter les transitions du DESTINATAIRE — sans quoi un bouton
 *   perime resterait affiche, ce qui ne ferait que deplacer le defaut d'un cran.
 */
describe('les transitions sont par operateur', () => {
  it("n'offre rien a qui ne peut pas decider", () => {
    expect(nextPublicationTransitions(PublicationState.DRAFT, false)).toEqual([]);
    expect(nextPublicationTransitions(PublicationState.ENDED, false)).toEqual([]);
  });

  it('offre les deux issues du brouillon a qui peut decider', () => {
    const offered = nextPublicationTransitions(PublicationState.DRAFT, true).map((t) => t.to);
    expect([...offered].sort()).toEqual(['reserve', 'scheduled']);
  });
});

/**
 * INVARIANT PROTEGE
 *   Le RANG suit la machine a etats, jamais l'ordre alphabetique.
 *
 * POURQUOI
 *   `studio-web` Q5 : le tableau des evenements trie par etat. Sans rang servi,
 *   chaque surface reinventerait `STATE_ORDER` — et l'ordre alphabetique
 *   placerait `draft` apres `replay-online`.
 */
describe('le rang des etats', () => {
  it('suit la machine, pas l\'alphabet', () => {
    expect(orderRankOf(PublicationState.DRAFT)).toBeLessThan(orderRankOf(PublicationState.SCHEDULED));
    expect(orderRankOf(PublicationState.LIVE)).toBeLessThan(orderRankOf(PublicationState.REPLAY_ONLINE));
    // L'alphabet placerait `draft` (d) apres `replay-online` (r) : ce n'est pas
    // ce qu'on veut, et c'est ce qu'une surface ferait sans rang servi.
    expect(orderRankOf(PublicationState.DRAFT)).toBeLessThan(orderRankOf(PublicationState.REPLAY_ONLINE));
  });
});

/**
 * INVARIANT PROTEGE
 *   La liste de controle qui fait foi a SEPT elements, et elle rend les
 *   MANQUANTS — jamais un pourcentage.
 *
 * POURQUOI
 *   `studio-web` Q7 : les fixtures en portent quatre, la fiche en affiche sept,
 *   et les deux repondent a la meme question. Les quatre sont un sous-ensemble
 *   arbitraire. Et l'ecran compte les manques (« publier — 3 manques ») : un
 *   pourcentage l'obligerait a recalculer ce que le serveur sait deja.
 */
describe('la porte de publication', () => {
  it('porte sept elements bloquants', () => {
    expect(PUBLICATION_CHECKLIST_ITEMS).toHaveLength(7);
  });

  it('rend la liste des manquants, pas un compte', () => {
    const readiness = publicationReadiness(['poster', 'description', 'capacity'], []);
    expect(readiness.ready).toBe(false);
    expect(readiness.missing).toContain('technical-check-passed');
    expect(readiness.missing).toContain('at-least-one-active-price');
    expect(readiness.missing).toHaveLength(4);
  });

  it('ne bloque PAS sur les chapitres ni sur le moderateur affecte', () => {
    // On doit pouvoir publier une date sans chapitres, et un poste non affecte
    // se rattrape jusqu'au dernier jour. Ils sont des avertissements.
    const readiness = publicationReadiness([...PUBLICATION_CHECKLIST_ITEMS], []);
    expect(readiness.ready).toBe(true);
    expect(readiness.warnings).toHaveLength(2);
  });
});
