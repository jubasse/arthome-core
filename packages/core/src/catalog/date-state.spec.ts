import { describe, expect, it } from 'vitest';

import { DateOutcome, DisplayState, PublicationState, RunState } from '../vocabulary/catalog.js';
import { ReplayPolicy } from '../vocabulary/catalog.js';
import { displayStateOf, isRoomOpen, progressOf, type DateTiming } from './date-state.js';

const timing: DateTiming = {
  startsAt: '2026-09-21T19:00:00.000Z',
  runtimeMin: 120,
  roomOpensBeforeMin: 30,
  replayPolicy: ReplayPolicy.INCLUDED,
  replayWindowHours: 48,
};

/**
 * INVARIANT PROTEGE
 *   `outcome` prime sur `run.state`, qui prime sur `publication.state`.
 *   Une seule valeur derivee, et personne ne la recompose.
 *
 * POURQUOI CE TEST EXISTE, ET POURQUOI IL TESTE LA TABLE COMPLETE
 *   E4 : trois axes coexistaient sans hierarchie ecrite, et chaque surface
 *   choisissait. Le cas qui fait mal PARAIT ABSURDE — une publication `live`,
 *   une antenne `on-air` et une issue `cancelled` en meme temps — et c'est
 *   precisement celui qu'un ORDRE DE CONSOMMATION KAFKA produit : les trois
 *   axes sont alimentes par trois sujets, et rien ne garantit qu'ils arrivent
 *   dans l'ordre ou ils se sont produits.
 *
 *   Tester les cas plausibles ne suffit donc pas : c'est la combinaison
 *   invraisemblable qui arrive en production.
 *
 *   Ecrit AVANT la regle.
 */
describe('displayStateOf — la preseance des trois axes', () => {
  it("laisse l'issue gagner contre une antenne en cours", () => {
    // Le cas « absurde » : il arrive.
    const result = displayStateOf({
      publicationState: PublicationState.LIVE,
      runState: RunState.ON_AIR,
      outcome: DateOutcome.CANCELLED,
      timing,
      now: '2026-09-21T19:30:00.000Z',
    });

    expect(result.state).toBe(DisplayState.CANCELLED);
  });

  it("laisse l'issue gagner sur les trois valeurs, sans exception", () => {
    for (const [outcome, expected] of [
      [DateOutcome.CANCELLED, DisplayState.CANCELLED],
      [DateOutcome.POSTPONED, DisplayState.POSTPONED],
      [DateOutcome.INTERRUPTED, DisplayState.INTERRUPTED],
    ] as const) {
      const result = displayStateOf({
        publicationState: PublicationState.LIVE,
        runState: RunState.ON_AIR,
        outcome,
        timing,
        now: '2026-09-21T19:30:00.000Z',
      });
      expect(result.state).toBe(expected);
    }
  });

  it("n'expire JAMAIS une issue : c'est un fait, pas un etat temporel", () => {
    const result = displayStateOf({
      publicationState: PublicationState.ENDED,
      runState: null,
      outcome: DateOutcome.CANCELLED,
      timing,
      now: '2027-01-01T00:00:00.000Z',
    });

    expect(result.validUntil).toBeNull();
  });

  it("laisse l'antenne gagner contre le temps quand aucune issue n'existe", () => {
    // La regie a passe a l'antenne AVANT l'heure annoncee : c'est l'antenne
    // qui fait foi, pas l'horaire.
    const result = displayStateOf({
      publicationState: PublicationState.TECHNICAL,
      runState: RunState.ON_AIR,
      outcome: null,
      timing,
      now: '2026-09-21T18:45:00.000Z',
    });

    expect(result.state).toBe(DisplayState.LIVE);
  });

  it("garde LIVE pendant une interruption d'antenne — le voile est par-dessus", () => {
    // `streaming.md` : l'ecran d'attente est un VOILE CLIENT pose par-dessus
    // une video intacte, jamais une bascule de flux. Tant qu'aucune issue n'est
    // declaree, le spectacle peut reprendre : l'etat affiche reste LIVE et
    // l'incident se superpose.
    const result = displayStateOf({
      publicationState: PublicationState.LIVE,
      runState: RunState.INTERRUPTED,
      outcome: null,
      timing,
      now: '2026-09-21T19:30:00.000Z',
    });

    expect(result.state).toBe(DisplayState.LIVE);
  });
});

/**
 * INVARIANT PROTEGE
 *   Un etat servi porte l'instant ou il CESSE d'etre vrai.
 *
 * POURQUOI
 *   C'est l'arbitrage qui reconcilie « aucune valeur calculee deux fois » avec
 *   « une reponse doit rester juste huit heures apres avoir ete mise en
 *   cache ». Cinq surfaces sur six ont pose la question. Sans `validUntil`, une
 *   application reveillee affiche des etats faux ET NE SAIT PAS QU'ILS LE SONT.
 */
describe('displayStateOf — la validite de ce qui est servi', () => {
  it("expire a l'ouverture de salle quand la date est a venir", () => {
    const result = displayStateOf({
      publicationState: PublicationState.SCHEDULED,
      runState: RunState.IDLE,
      outcome: null,
      timing,
      now: '2026-09-21T12:00:00.000Z',
    });

    expect(result.state).toBe(DisplayState.SCHEDULED);
    expect(result.validUntil).toBe('2026-09-21T18:30:00.000Z');
  });

  it("expire au lever de rideau quand la salle est ouverte", () => {
    const result = displayStateOf({
      publicationState: PublicationState.SCHEDULED,
      runState: RunState.IDLE,
      outcome: null,
      timing,
      now: '2026-09-21T18:45:00.000Z',
    });

    expect(result.state).toBe(DisplayState.ROOM_OPEN);
    expect(result.validUntil).toBe('2026-09-21T19:00:00.000Z');
  });

  it('sert une validite JUSTE a la seconde qui precede la bascule', () => {
    // Le cas qui fait mal : un etat servi UNE SECONDE avant l'ouverture de
    // salle doit valoir jusqu'a cet instant-la, pas « maintenant + 60 s ».
    const result = displayStateOf({
      publicationState: PublicationState.SCHEDULED,
      runState: RunState.IDLE,
      outcome: null,
      timing,
      now: '2026-09-21T18:29:59.000Z',
    });

    expect(result.state).toBe(DisplayState.SCHEDULED);
    expect(result.validUntil).toBe('2026-09-21T18:30:00.000Z');
  });

  it("expire a la fin de la fenetre de rediffusion", () => {
    const result = displayStateOf({
      publicationState: PublicationState.REPLAY_ONLINE,
      runState: null,
      outcome: null,
      timing,
      now: '2026-09-22T10:00:00.000Z',
    });

    expect(result.state).toBe(DisplayState.REPLAY);
    // Fin du direct (21 h) + 48 h.
    expect(result.validUntil).toBe('2026-09-23T21:00:00.000Z');
  });

  it("ne porte aucune validite sur un etat que seule une commande change", () => {
    const result = displayStateOf({
      publicationState: PublicationState.DRAFT,
      runState: null,
      outcome: null,
      timing,
      now: '2026-09-01T10:00:00.000Z',
    });

    expect(result.state).toBe(DisplayState.DRAFT);
    expect(result.validUntil).toBeNull();
  });

  it('tombe en FINISHED quand la rediffusion a expire', () => {
    const result = displayStateOf({
      publicationState: PublicationState.REPLAY_ONLINE,
      runState: null,
      outcome: null,
      timing,
      now: '2026-09-25T00:00:00.000Z',
    });

    expect(result.state).toBe(DisplayState.ENDED);
    expect(result.validUntil).toBeNull();
  });

  it("n'annonce jamais de rediffusion quand la politique l'interdit", () => {
    const result = displayStateOf({
      publicationState: PublicationState.ENDED,
      runState: null,
      outcome: null,
      timing: { ...timing, replayPolicy: ReplayPolicy.NONE, replayWindowHours: 0 },
      now: '2026-09-21T22:00:00.000Z',
    });

    expect(result.state).toBe(DisplayState.ENDED);
  });
});

describe('les derivations temporelles que la surface reevalue elle-meme', () => {
  it("ouvre la salle exactement 30 minutes avant, borne incluse", () => {
    expect(isRoomOpen(timing, '2026-09-21T18:29:59.000Z')).toBe(false);
    expect(isRoomOpen(timing, '2026-09-21T18:30:00.000Z')).toBe(true);
    expect(isRoomOpen(timing, '2026-09-21T18:59:59.000Z')).toBe(true);
    // Au lever de rideau, la salle n'est plus « ouverte » : le direct commence.
    expect(isRoomOpen(timing, '2026-09-21T19:00:00.000Z')).toBe(false);
  });

  it('borne la progression entre 0 et 1', () => {
    expect(progressOf(timing, '2026-09-21T18:00:00.000Z')).toBe(0);
    expect(progressOf(timing, '2026-09-21T20:00:00.000Z')).toBe(0.5);
    expect(progressOf(timing, '2026-09-22T00:00:00.000Z')).toBe(1);
  });
});
