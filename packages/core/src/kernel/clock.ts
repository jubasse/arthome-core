/**
 * L'horloge est un PORT, jamais `Date.now()` appele au fond d'une regle.
 *
 * C'est le remodelage le plus envahissant du portage, et il n'est pas
 * negociable. `shared/helpers.js` lit une horloge implicite au fond de
 * `stateOf`, `isRoomOpen`, `replayHoursLeft` et `dayLabel` ; et tout
 * `shared/` est bati sur des decalages relatifs a l'ouverture de
 * l'application — `catalogue.json` le dit lui-meme : « nothing here expires ».
 * Excellent pour une maquette, inutilisable sur un contrat.
 *
 * Deux consequences :
 *   - une regle qui lit l'heure systeme n'est pas testable. Un test qui passe a
 *     23 h 59 et echoue a 00 h 01 a trouve un `Date.now()` oublie ;
 *   - un paquet importe par sept services NE PEUT PAS porter d'etat global.
 *     Deux requetes concurrentes partageraient la meme horloge, la meme langue
 *     et le meme pays.
 */

/** Un instant, en ISO 8601 UTC. Jamais un decalage en minutes (D7). */
export type Instant = string;

export interface Clock {
  /** L'instant courant, en ISO 8601 UTC. */
  now(): Instant;
  /** Le meme instant en millisecondes depuis l'epoque, pour l'arithmetique. */
  nowMs(): number;
}

/** L'horloge de production. La seule qui lise l'heure de la machine. */
export class SystemClock implements Clock {
  public now(): Instant {
    return new Date().toISOString();
  }

  public nowMs(): number {
    return Date.now();
  }
}

/**
 * L'horloge des tests, et du jeu de donnees deterministe.
 *
 * `advance` existe pour les tests de fenetre — expiration de rediffusion,
 * bail de lecture, validite d'un devis — ou l'interet est justement de faire
 * passer un instant.
 */
export class FixedClock implements Clock {
  private ms: number;

  public constructor(instant: Instant | number) {
    this.ms = typeof instant === 'number' ? instant : Date.parse(instant);
  }

  public now(): Instant {
    return new Date(this.ms).toISOString();
  }

  public nowMs(): number {
    return this.ms;
  }

  /** Avance l'horloge. Rend l'instant atteint. */
  public advance(millis: number): Instant {
    this.ms += millis;
    return this.now();
  }
}
