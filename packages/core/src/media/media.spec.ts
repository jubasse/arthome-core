import { describe, expect, it } from 'vitest';

import { pickRendition, rendition, smallestRendition } from './index.js';

/**
 * INVARIANT PROTEGE
 *   Un client ne choisit jamais sa largeur d'image : il prend la rendition
 *   servie la plus proche, sans jamais descendre sous ce qu'il affiche.
 *
 * POURQUOI
 *   `storefront-tv` : « un fond 4K decode pour une vignette coute autant qu'un
 *   plein ecran, et c'est le premier levier de pression memoire d'une UI TV ».
 *   Beaucoup d'appareils du parc ont 1 a 1,5 Go AU TOTAL, dont l'application
 *   recoit 300 a 500 Mo. Une recette d'URL avec un gabarit de largeur laisse le
 *   client se tromper ; des renditions declarees ne le permettent pas.
 */
describe('le choix d\'une rendition', () => {
  const set = [
    rendition('https://cdn/a-320.jpg', 320, 180),
    rendition('https://cdn/a-640.jpg', 640, 360),
    rendition('https://cdn/a-1280.jpg', 1280, 720),
  ];

  it('ne descend jamais sous la largeur affichee quand une plus grande existe', () => {
    // L'asymetrie est voulue : une image trop petite est floue et definitive —
    // l'utilisateur la voit. Une image trop grande coute de la memoire et se
    // redimensionne. On choisit le defaut qui ne se voit pas.
    expect(pickRendition(set, 400)?.widthPx).toBe(640);
    expect(pickRendition(set, 640)?.widthPx).toBe(640);
    expect(pickRendition(set, 641)?.widthPx).toBe(1280);
  });

  it('rend la plus grande disponible quand rien n\'atteint la cible', () => {
    // Plutot que rien : une image trop petite vaut mieux qu'un trou.
    expect(pickRendition(set, 4000)?.widthPx).toBe(1280);
  });

  it('rend null sur un jeu vide, jamais une URL inventee', () => {
    expect(pickRendition([], 320)).toBeNull();
    expect(smallestRendition([])).toBeNull();
  });

  it('donne la plus petite pour le mode veille', () => {
    // Le mode ambiant d'un televiseur tourne des heures et ne doit rien
    // demander : il reemploie les affiches deja en main, a la plus petite
    // taille disponible.
    expect(smallestRendition(set)?.widthPx).toBe(320);
  });

  it('refuse une taille absurde plutot que de la servir', () => {
    expect(() => rendition('https://cdn/a.jpg', 0, 180)).toThrow();
    expect(() => rendition('', 320, 180)).toThrow();
  });
});
