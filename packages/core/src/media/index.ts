/**
 * Renditions are declared, never composed from a URL template.
 * Fleet televisions have 1 to 1.5 GB in total, the application gets 300 to
 * 500 MB of it, and one 4K decode eats 100 to 200: a client that picks its own
 * width picks badly, so the contract serves the sizes actually displayed.
 */

import { DomainError } from '../kernel/errors.js';
import { DomainErrorCode } from '../vocabulary/error-codes.js';

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

export function rendition(url: string, widthPx: number, heightPx: number): Rendition {
  if (url.length === 0) throw new DomainError({ code: DomainErrorCode.MEDIA_URL_EMPTY });
  if (!Number.isInteger(widthPx) || widthPx <= 0 || !Number.isInteger(heightPx) || heightPx <= 0) {
    throw new DomainError({
      code: DomainErrorCode.MEDIA_SIZE_INVALID,
      params: { width: String(widthPx), height: String(heightPx) },
    });
  }
  return { url, widthPx, heightPx };
}

/**
 * The rendition closest to the requested width, never below it when a larger one
 * exists: too small is blurry and final, too large only costs memory.
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
