import { describe, expect, it } from 'vitest';

import {
  hasLanguageBarrier,
  isLanguageNeutral,
  isUnderstandable,
  type LanguageProfile,
} from './language.js';
import { LanguageDependency } from '../vocabulary/catalog.js';

const profile = (over: Partial<LanguageProfile> = {}): LanguageProfile => ({
  spoken: ['fr'],
  subtitles: [],
  surtitles: [],
  dependency: LanguageDependency.ESSENTIAL,
  ...over,
});

/**
 * D1: `essential` was ABSENT from the declared vocabulary yet carried by five shows, translated,
 * and made its test by `helpers.js:437` — while `light` was used nowhere.
 */
describe('the language barrier', () => {
  it('hangs entirely on `essential`', () => {
    expect(hasLanguageBarrier(profile({ dependency: LanguageDependency.ESSENTIAL }))).toBe(true);
    expect(hasLanguageBarrier(profile({ dependency: LanguageDependency.HELPFUL }))).toBe(false);
    expect(hasLanguageBarrier(profile({ dependency: LanguageDependency.NONE }))).toBe(false);
  });

  it('tells "barrier-free for anyone" apart from "followable by me"', () => {
    expect(isLanguageNeutral(profile({ dependency: LanguageDependency.NONE }))).toBe(true);
    expect(isLanguageNeutral(profile({ dependency: LanguageDependency.HELPFUL }))).toBe(false);
  });
});

/** `helpful` stays followable without the languages I understand: the point of the middle value. */
describe('"can this show be followed?"', () => {
  it('is always yes when language does not matter', () => {
    const dance = profile({ spoken: [], dependency: LanguageDependency.NONE });
    expect(isUnderstandable(dance, [])).toBe(true);
    expect(isUnderstandable(dance, ['ja'])).toBe(true);
  });

  it('is yes when I understand the performed language', () => {
    expect(isUnderstandable(profile(), ['fr'])).toBe(true);
    expect(isUnderstandable(profile(), ['FR'])).toBe(true);
  });

  it('is yes when subtitles cover me', () => {
    expect(isUnderstandable(profile({ subtitles: ['en'] }), ['en'])).toBe(true);
    expect(isUnderstandable(profile({ surtitles: ['de'] }), ['de'])).toBe(true);
  });

  it('is NO when the language is essential and nothing covers me', () => {
    expect(isUnderstandable(profile({ subtitles: ['en'] }), ['ja'])).toBe(false);
  });

  it('stays YES when the language is only `helpful`', () => {
    const opera = profile({ dependency: LanguageDependency.HELPFUL, subtitles: ['en'] });
    expect(isUnderstandable(opera, ['ja'])).toBe(true);
  });
});
