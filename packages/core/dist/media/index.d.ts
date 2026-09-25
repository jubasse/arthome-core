/**
 * Renditions are declared, never composed from a URL template.
 * ⚠ Fleet televisions have 1 to 1.5 GB in total, the application gets 300 to
 * 500 MB of it, and one 4K decode eats 100 to 200: a client that picks its own
 * width picks badly, so the contract serves the sizes actually displayed.
 */
/** One image at a size that is actually displayed. */
export interface Rendition {
    readonly url: string;
    readonly widthPx: number;
    readonly heightPx: number;
}
/** An entity's image set, in the two aspect ratios the surfaces display. */
export interface MediaSet {
    readonly wide: readonly Rendition[];
    readonly poster: readonly Rendition[];
}
export declare function rendition(url: string, widthPx: number, heightPx: number): Rendition;
/**
 * The rendition closest to the requested width, never below it when a larger one
 * exists: too small is blurry and final, too large only costs memory.
 */
export declare function pickRendition(renditions: readonly Rendition[], targetWidthPx: number): Rendition | null;
/** The smallest rendition — a television's standby mode, a thumbnail. */
export declare function smallestRendition(renditions: readonly Rendition[]): Rendition | null;
export declare function emptyMediaSet(): MediaSet;
//# sourceMappingURL=index.d.ts.map