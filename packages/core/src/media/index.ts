/**
 * Media: DECLARED RENDITIONS, never a URL recipe.
 *
 * `helpers.js` carries `imageUrl(kind, key, width)`, which composes a URL from
 * a template — `https://…/{id}?w={w}`. That is a mockup convenience, and it is
 * exactly what `storefront-tv` refuses, for a reason of MEMORY and not of
 * comfort:
 *
 *   "a 4K background decoded for a thumbnail costs as much as a full screen,
 *    and it is the first source of memory pressure in a TV UI."
 *
 * Many devices in the fleet have 1 to 1.5 GB IN TOTAL, of which the application
 * gets 300 to 500 MB, and one 4K decode eats 100 to 200 on its own. A client
 * that chooses its own width chooses badly: so the contract serves the sizes
 * ACTUALLY DISPLAYED, and the surface takes the nearest one.
 */

import { DomainError } from '../kernel/errors.js';

/** One image at a size that is actually displayed. */
export interface Rendition {
  readonly url: string;
  readonly widthPx: number;
  readonly heightPx: number;
}

/**
 * An entity's image set, in the two aspect ratios the surfaces display.
 *
 * Both exist because `storefront-tv` tells them apart: a wide 16:9 image for
 * rows, a 2:3 poster for grids. A single shape would force cropping, hence
 * decoding larger than necessary.
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
 * The rendition closest to the requested width, NEVER going below it when a
 * larger one exists.
 *
 * The asymmetry is deliberate: an image that is too small is blurry and final —
 * the user sees it — while an image that is too large costs memory and can be
 * resized. Between the two faults, we choose the one that does not show. And
 * when only smaller sizes exist, we return the largest available rather than
 * nothing.
 */
export function pickRendition(
  renditions: readonly Rendition[],
  targetWidthPx: number,
): Rendition | null {
  if (renditions.length === 0) return null;
  const sorted = [...renditions].sort((left, right) => left.widthPx - right.widthPx);
  const atLeast = sorted.find((entry) => entry.widthPx >= targetWidthPx);
  return atLeast ?? sorted[sorted.length - 1] ?? null;
}

/** The smallest rendition — a television's standby mode, a thumbnail. */
export function smallestRendition(renditions: readonly Rendition[]): Rendition | null {
  return renditions.reduce<Rendition | null>(
    (smallest, entry) => (smallest === null || entry.widthPx < smallest.widthPx ? entry : smallest),
    null,
  );
}

export function emptyMediaSet(): MediaSet {
  return { wide: [], poster: [] };
}
