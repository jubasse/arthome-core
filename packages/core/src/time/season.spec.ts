import { describe, expect, it } from 'vitest';

import { seasonBounds, seasonLabel } from './season.js';

/**
 * INVARIANT PROTEGE
 *   Les bornes d'une saison sont une notion de DOMAINE, servie une fois.
 *
 * POURQUOI
 *   `studio-web` Q12 : le selecteur de periode offre « saison » a cote de 7, 30
 *   et 90 jours, et il refusait — a juste titre — de la coder dans le studio.
 *   Sans cette regle, cinq surfaces devineraient cinq dates de bascule.
 */
describe('la saison de spectacle vivant', () => {
  it('court du 1er septembre au 31 aout', () => {
    const bounds = seasonBounds('2026-11-20T20:00:00.000Z', 0);
    expect(bounds.start).toBe('2026-09-01T00:00:00.000Z');
    expect(bounds.end).toBe('2027-09-01T00:00:00.000Z');
  });

  it('rattache janvier a la saison qui a commence en septembre precedent', () => {
    const bounds = seasonBounds('2027-01-15T20:00:00.000Z', 0);
    expect(bounds.start).toBe('2026-09-01T00:00:00.000Z');
    expect(seasonLabel('2027-01-15T20:00:00.000Z', 0)).toBe('2026-2027');
  });

  it('bascule a la bonne minute, dans le fuseau de la salle', () => {
    // Le cas qui fait mal : le 31 aout a 23 h 30 HEURE DE SALLE est encore la
    // saison precedente, meme si l'instant UTC est deja au 1er septembre.
    const instant = '2026-08-31T22:30:00.000Z'; // 00 h 30 le 1er sept. a Paris (UTC+2)

    expect(seasonLabel(instant, 0)).toBe('2025-2026'); // en UTC : 31 aout
    expect(seasonLabel(instant, 120)).toBe('2026-2027'); // a Paris : 1er septembre
  });
});
