/**
 * Les medias : des RENDITIONS DECLAREES, jamais une recette d'URL.
 *
 * `helpers.js` porte `imageUrl(kind, key, width)` qui compose une URL depuis un
 * gabarit — `https://…/{id}?w={w}`. C'est une commodite de maquette, et c'est
 * precisement ce que `storefront-tv` refuse, pour une raison de MEMOIRE et non
 * de confort :
 *
 *   « un fond 4K decode pour une vignette coute autant qu'un plein ecran, et
 *     c'est le premier levier de pression memoire d'une UI TV. »
 *
 * Beaucoup d'appareils du parc ont 1 a 1,5 Go AU TOTAL, dont l'application
 * recoit 300 a 500 Mo, et un decodage 4K en consomme 100 a 200 a lui seul. Un
 * client qui choisit sa largeur choisit mal : le contrat sert donc les tailles
 * REELLEMENT AFFICHEES, et la surface prend la plus proche.
 */

import { DomainError } from '../kernel/errors.js';

/** Un visuel a une taille reellement affichee. */
export interface Rendition {
  readonly url: string;
  readonly widthPx: number;
  readonly heightPx: number;
}

/**
 * Le jeu de visuels d'une entite, aux deux formats que les surfaces affichent.
 *
 * Les deux existent parce que `storefront-tv` les distingue : un visuel large
 * 16/9 pour les rangees, une affiche 2/3 pour les grilles. Une seule forme
 * obligerait a recadrer, donc a decoder plus grand que necessaire.
 */
export interface MediaSet {
  readonly wide: readonly Rendition[];
  readonly poster: readonly Rendition[];
}

export function rendition(url: string, widthPx: number, heightPx: number): Rendition {
  if (url.length === 0) throw new DomainError({ code: 'media.url_empty' });
  if (!Number.isInteger(widthPx) || widthPx <= 0 || !Number.isInteger(heightPx) || heightPx <= 0) {
    throw new DomainError({
      code: 'media.size_invalid',
      params: { width: String(widthPx), height: String(heightPx) },
    });
  }
  return { url, widthPx, heightPx };
}

/**
 * La rendition la plus proche de la largeur demandee, SANS jamais descendre
 * sous elle quand une plus grande existe.
 *
 * L'asymetrie est voulue : une image trop petite est floue et definitive —
 * l'utilisateur la voit —, une image trop grande coute de la memoire et se
 * redimensionne. Entre les deux defauts, on choisit celui qui ne se voit pas.
 * Et quand il n'existe que des tailles inferieures, on rend la plus grande
 * disponible plutot que rien.
 */
export function pickRendition(renditions: readonly Rendition[], targetWidthPx: number): Rendition | null {
  if (renditions.length === 0) return null;
  const sorted = [...renditions].sort((left, right) => left.widthPx - right.widthPx);
  const atLeast = sorted.find((entry) => entry.widthPx >= targetWidthPx);
  return atLeast ?? sorted[sorted.length - 1] ?? null;
}

/** La plus petite rendition — le mode veille d'un televiseur, une vignette. */
export function smallestRendition(renditions: readonly Rendition[]): Rendition | null {
  return renditions.reduce<Rendition | null>(
    (smallest, entry) => (smallest === null || entry.widthPx < smallest.widthPx ? entry : smallest),
    null,
  );
}

export function emptyMediaSet(): MediaSet {
  return { wide: [], poster: [] };
}
