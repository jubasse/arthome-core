/**
 * Un generateur pseudo-aleatoire DETERMINISTE.
 *
 * `fixtures.js` a une seconde vie apres le portage : jeu de donnees de test et
 * de demonstration. Deterministe, il produit le meme catalogue a chaque
 * execution — un socle solide pour les tests d'integration et les
 * environnements de recette.
 *
 * ⚠ `Math.random()` est proscrit ici, et pas par purisme : un jeu de donnees
 * non reproductible rend un test intermittent, et un test intermittent finit
 * par etre desactive. C'est aussi ce qui permet au `FakePaymentAdapter` de
 * tourner SANS CLE ET SANS RESEAU, ce que la demonstration publique exige.
 */

/**
 * Mulberry32 — trente-deux bits d'etat, une multiplication, trois decalages.
 *
 * Choisi pour ce qu'il n'a pas : aucune dependance, aucune API de plateforme,
 * et un comportement identique sous Node, Metro et un navigateur. La qualite
 * statistique suffit largement a repartir des dates dans un calendrier ; on ne
 * chiffre rien avec.
 */
export class DeterministicRandom {
  private state: number;

  public constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Un flottant dans `[0, 1)`. */
  public next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  }

  /** Un entier dans `[min, max]`, bornes incluses. */
  public intBetween(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Un element, ou `null` si la liste est vide — jamais `undefined`. */
  public pick<T>(values: readonly T[]): T | null {
    if (values.length === 0) return null;
    return values[this.intBetween(0, values.length - 1)] ?? null;
  }

  public chance(probability: number): boolean {
    return this.next() < probability;
  }
}
