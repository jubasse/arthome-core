import { describe, expect, it } from 'vitest';

import { Locale } from './locale.js';
import { formatClock, formatCountdown, formatDuration, formatLongDate, formatTimecode } from './time.js';

/**
 * INVARIANT PROTEGE
 *   Le formatage du temps se fait SANS `Intl`, avec un decalage EXPLICITE.
 *
 * POURQUOI CE TEST EXISTE
 *   Le moteur JavaScript de React Native n'offre pas partout une
 *   implementation `Intl` complete, et le polyfill coute plusieurs centaines de
 *   kilo-octets — dans CINQ applications. `storefront-mobile` l'a verifie :
 *   `helpers.js` formate deja entierement a la main, et c'est exactement ce
 *   qu'il faut garder.
 *
 *   Et aucune de ces fonctions ne devine un fuseau : le decalage est servi par
 *   le serveur, recalcule pour l'instant concerne (D3).
 */
describe("l'heure, dans le fuseau qu'on lui donne", () => {
  const instant = '2026-09-21T19:04:00.000Z';

  it('rend la meme heure dans deux formes selon la langue', () => {
    expect(formatClock(instant, 120, Locale.FR)).toBe('21 h 04');
    expect(formatClock(instant, 120, Locale.EN)).toBe('9:04 PM');
  });

  it('rend DEUX heures differentes pour deux decalages — les deux horloges', () => {
    // C'est le principe « heure du spectateur d'abord, heure de salle en
    // second quand elle differe », rendu possible parce que le decalage est un
    // argument et non un global.
    expect(formatClock(instant, 120, Locale.FR)).toBe('21 h 04');
    expect(formatClock(instant, -240, Locale.FR)).toBe('15 h 04');
  });

  it('gere minuit et midi sans se tromper de moitie de journee', () => {
    expect(formatClock('2026-09-21T22:00:00.000Z', 120, Locale.EN)).toBe('12:00 AM');
    expect(formatClock('2026-09-21T10:00:00.000Z', 120, Locale.EN)).toBe('12:00 PM');
  });

  it('nomme le jour et le mois sans Intl', () => {
    expect(formatLongDate('2026-10-12T10:00:00.000Z', 120, Locale.FR)).toBe('lundi 12 octobre');
    expect(formatLongDate('2026-10-12T10:00:00.000Z', 120, Locale.EN)).toBe('Monday October 12');
  });

  it('change de jour avec le decalage', () => {
    // 23 h 30 UTC : deja le lendemain a Paris, encore la veille a Montreal.
    const late = '2026-10-12T23:30:00.000Z';
    expect(formatLongDate(late, 120, Locale.FR)).toBe('mardi 13 octobre');
    expect(formatLongDate(late, -240, Locale.FR)).toBe('lundi 12 octobre');
  });
});

/**
 * INVARIANT PROTEGE
 *   Une DUREE se declare, un DECOMPTE se compte. Ce ne sont pas la meme chose.
 */
describe('duree et decompte', () => {
  it('declare une duree de spectacle', () => {
    expect(formatDuration(150, Locale.FR)).toBe('2 h 30');
    expect(formatDuration(120, Locale.FR)).toBe('2 h');
    expect(formatDuration(45, Locale.FR)).toBe('45 min');
    expect(formatDuration(150, Locale.EN)).toBe('2h 30m');
  });

  it('compte en jours au-dela de vingt-quatre heures', () => {
    expect(formatCountdown(42, Locale.FR)).toBe('42 min');
    expect(formatCountdown(130, Locale.FR)).toBe('2 h 10');
    expect(formatCountdown(4320, Locale.FR)).toBe('3 jours');
    expect(formatCountdown(1440, Locale.FR)).toBe('1 jour');
  });

  it('ne rend jamais un decompte negatif', () => {
    // Une horloge de telephone qui derive peut produire un ecart negatif. Un
    // « -3 min » a l'ecran serait pire qu'un « 0 min ».
    expect(formatCountdown(-50, Locale.FR)).toBe('0 min');
  });
});

/**
 * INVARIANT PROTEGE
 *   Un code temporel a TOUJOURS la meme forme, quelle que soit la langue.
 *
 * POURQUOI
 *   C'est une position dans un media, pas une heure : elle se lit sur une barre
 *   de lecture et se compare d'un coup d'oeil. La localiser la rendrait
 *   illisible.
 */
describe('le code temporel', () => {
  it('omet les heures quand il n\'y en a pas', () => {
    expect(formatTimecode(69)).toBe('1:09');
    expect(formatTimecode(3969)).toBe('1:06:09');
    expect(formatTimecode(0)).toBe('0:00');
  });

  it('borne a zero plutot que de rendre un temps negatif', () => {
    expect(formatTimecode(-5)).toBe('0:00');
  });
});
