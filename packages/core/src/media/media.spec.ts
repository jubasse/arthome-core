import { describe, expect, it } from 'vitest';

import { pickRendition, rendition, smallestRendition } from './index.js';

/**
 * PROTECTED INVARIANT
 *   A client never chooses its own image width: it takes the nearest rendition
 *   served, never going below what it displays.
 *
 * WHY
 *   `storefront-tv`: "a 4K background decoded for a thumbnail costs as much as
 *   a full screen, and it is the first source of memory pressure in a TV UI".
 *   Many devices in the fleet have 1 to 1.5 GB IN TOTAL, of which the
 *   application gets 300 to 500 MB. A URL recipe with a width template lets the
 *   client get it wrong; declared renditions do not allow that.
 */
describe('choosing a rendition', () => {
  const set = [
    rendition('https://cdn/a-320.jpg', 320, 180),
    rendition('https://cdn/a-640.jpg', 640, 360),
    rendition('https://cdn/a-1280.jpg', 1280, 720),
  ];

  it('never goes below the displayed width when a larger one exists', () => {
    // The asymmetry is deliberate: an image that is too small is blurry and
    // final — the user sees it. An image that is too large costs memory and can
    // be resized. We choose the fault that does not show.
    expect(pickRendition(set, 400)?.widthPx).toBe(640);
    expect(pickRendition(set, 640)?.widthPx).toBe(640);
    expect(pickRendition(set, 641)?.widthPx).toBe(1280);
  });

  it('returns the largest available when nothing reaches the target', () => {
    // Rather than nothing: an image that is too small beats a hole.
    expect(pickRendition(set, 4000)?.widthPx).toBe(1280);
  });

  it('returns null on an empty set, never an invented URL', () => {
    expect(pickRendition([], 320)).toBeNull();
    expect(smallestRendition([])).toBeNull();
  });

  it('gives the smallest one for standby mode', () => {
    // A television's ambient mode runs for hours and must ask for nothing: it
    // reuses the posters already in hand, at the smallest size available.
    expect(smallestRendition(set)?.widthPx).toBe(320);
  });

  it('refuses an absurd size rather than serving it', () => {
    expect(() => rendition('https://cdn/a.jpg', 0, 180)).toThrow();
    expect(() => rendition('', 320, 180)).toThrow();
  });
});
