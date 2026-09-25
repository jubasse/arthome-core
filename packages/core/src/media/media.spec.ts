import { describe, expect, it } from 'vitest';

import { pickRendition, rendition, smallestRendition } from './index.js';

describe('choosing a rendition', () => {
  const set = [
    rendition('https://cdn/a-320.jpg', 320, 180),
    rendition('https://cdn/a-640.jpg', 640, 360),
    rendition('https://cdn/a-1280.jpg', 1280, 720),
  ];

  it('never goes below the displayed width when a larger one exists', () => {
    expect(pickRendition(set, 400)?.widthPx).toBe(640);
    expect(pickRendition(set, 640)?.widthPx).toBe(640);
    expect(pickRendition(set, 641)?.widthPx).toBe(1280);
  });

  it('returns the largest available when nothing reaches the target', () => {
    expect(pickRendition(set, 4000)?.widthPx).toBe(1280);
  });

  it('returns null on an empty set, never an invented URL', () => {
    expect(pickRendition([], 320)).toBeNull();
    expect(smallestRendition([])).toBeNull();
  });

  it('gives the smallest one for standby mode', () => {
    expect(smallestRendition(set)?.widthPx).toBe(320);
  });

  it('refuses an absurd size rather than serving it', () => {
    expect(() => rendition('https://cdn/a.jpg', 0, 180)).toThrow();
    expect(() => rendition('', 320, 180)).toThrow();
  });
});
