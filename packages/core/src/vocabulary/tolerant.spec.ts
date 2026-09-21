import { describe, expect, it } from 'vitest';

import { DATE_OUTCOMES, DisplayState } from './catalog.js';
import { PLAN_OPENINGS, PlanOpening } from './commerce.js';
import { isMember, memberOr, parseTolerant } from './tolerant.js';

/**
 * INVARIANT PROTEGE
 *   Une valeur d'enumeration inconnue est CONSERVEE et traitee comme neutre.
 *   Elle ne fait echouer ni la carte, ni la page.
 *
 * POURQUOI CE TEST EXISTE
 *   C'est la seule regle de ce paquet dont le defaut est irrattrapable a
 *   distance. Une revue de magasin TV est lente : une version publiee
 *   aujourd'hui tournera dans des salons dans un an. Le jour ou le catalogue
 *   gagne une 22e discipline, une nouvelle issue ou un nouveau regime de tchat,
 *   CES TELEVISEURS LA RECEVRONT — et une validation stricte ne degrade pas une
 *   carte, elle fait echouer la PAGE ENTIERE.
 *
 *   Ecrit AVANT la regle, comme les deux autres regles a risque.
 */
describe('parseTolerant — la survie du parc', () => {
  it("conserve une 22e discipline inconnue au lieu de la rejeter", () => {
    const result = parseTolerant(DATE_OUTCOMES, 'rescheduled-twice');

    expect(result.known).toBe(false);
    // La valeur n'est pas perdue : la surface peut la journaliser et afficher
    // un libelle generique, plutot qu'un code brut ou rien du tout.
    expect(result).toEqual({ known: false, raw: 'rescheduled-twice' });
  });

  it('reconnait une valeur du vocabulaire et la rend typee', () => {
    const result = parseTolerant(DATE_OUTCOMES, 'cancelled');

    expect(result).toEqual({ known: true, value: 'cancelled' });
  });

  it("ne jette JAMAIS, quelle que soit l'entree", () => {
    // Le cas qui compte n'est pas la valeur plausible : c'est celle que
    // personne n'a prevue. Une chaine vide, un identifiant d'un autre
    // vocabulaire, une valeur d'une version future.
    for (const raw of ['', 'live', 'UNSPECIFIED', 'étoile', '0', 'null']) {
      expect(() => parseTolerant(DATE_OUTCOMES, raw)).not.toThrow();
    }
  });

  it("ne fait pas echouer une PAGE quand une seule carte porte l'inconnu", () => {
    // La simulation exacte du defaut redoute : une page de cartes dont UNE
    // porte une valeur inedite. Les autres doivent rendre.
    const page = ['cancelled', 'discipline-22', 'postponed'];

    const parsed = page.map((raw) => parseTolerant(DATE_OUTCOMES, raw));

    expect(parsed.filter((entry) => entry.known)).toHaveLength(2);
    expect(parsed).toHaveLength(3);
  });

  it('distingue les vocabulaires qui partagent une valeur', () => {
    // `replays` appartient aux ouvertures de formule ET aux entrees de
    // navigation du studio : deux notions differentes, un meme mot. Chaque
    // vocabulaire repond pour lui-meme.
    expect(isMember(PLAN_OPENINGS, PlanOpening.REPLAYS)).toBe(true);
    expect(isMember(DATE_OUTCOMES, PlanOpening.REPLAYS)).toBe(false);
  });
});

/**
 * INVARIANT PROTEGE
 *   Un repli est TOUJOURS explicite a l'appel.
 *
 * POURQUOI
 *   E1, verifie : `helpers.planOf()` fait `filter(...)[0] || plans()[0]`.
 *   Aucun compte de reference ne trouve le sien, donc TOUS retombent
 *   silencieusement sur `free` — et comme `plan.opens[]` conditionne l'acces a
 *   la lecture, c'est un defaut d'AUTORISATION. Un repli cache dans une
 *   fonction utilitaire reproduirait exactement ce defaut.
 */
describe('memberOr — le repli ne se cache pas', () => {
  it('rend le repli demande, pas le premier membre du vocabulaire', () => {
    expect(memberOr(DATE_OUTCOMES, 'inconnu', 'cancelled')).toBe('cancelled');
    // Et surtout : le repli n'est PAS `DATE_OUTCOMES[0]`.
    expect(memberOr(DATE_OUTCOMES, 'inconnu', 'interrupted')).toBe('interrupted');
  });

  it('rend la valeur quand elle est connue', () => {
    expect(memberOr(DATE_OUTCOMES, 'postponed', 'cancelled')).toBe('postponed');
  });
});

describe('les membres nommes valent les valeurs du fil', () => {
  it("expose la meme chaine que l'orthographe de shared/", () => {
    // K6 : trois orthographes pour une valeur dont depend `decideWatch`.
    // Sur le fil, c'est le kebab-case de `shared/` qui fait autorite.
    expect(PlanOpening.MULTI_SCREEN).toBe('multi-screen');
    expect(PlanOpening.FREE_DATES).toBe('free-dates');
    expect(PlanOpening.ONE_LIVE_MONTH).toBe('one-live-month');
    // Et l'issue EST l'etat affiche : meme valeur, deux axes.
    expect(DisplayState.CANCELLED).toBe('cancelled');
  });
});
