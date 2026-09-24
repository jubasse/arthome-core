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
export declare function rendition(url: string, widthPx: number, heightPx: number): Rendition;
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
export declare function pickRendition(renditions: readonly Rendition[], targetWidthPx: number): Rendition | null;
/** The smallest rendition — a television's standby mode, a thumbnail. */
export declare function smallestRendition(renditions: readonly Rendition[]): Rendition | null;
export declare function emptyMediaSet(): MediaSet;
//# sourceMappingURL=index.d.ts.map