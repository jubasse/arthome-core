import { describe, expect, it } from 'vitest';

import { LanguageDependency } from '../vocabulary/catalog.js';
import {
  hasLanguageBarrier,
  isLanguageNeutral,
  isUnderstandable,
  type LanguageProfile,
} from './language.js';

const profile = (over: Partial<LanguageProfile> = {}): LanguageProfile => ({
  spoken: ['fr'],
  subtitles: [],
  surtitles: [],
  dependency: LanguageDependency.ESSENTIAL,
  ...over,
});

/**
 * PROTECTED INVARIANT
 *   The `languageDependency` vocabulary contains `essential`, and that is the
 *   value the rule depends on.
 *
 * WHY THIS TEST EXISTS
 *   D1 — the most verifiable correction in the file. `taxonomy.json` declares
 *   `none | light | helpful`. But `essential` is ABSENT from the vocabulary,
 *   carried by five shows, translated in the i18n, and `helpers.js:437` MAKES
 *   IT ITS TEST. While `light` is used NOWHERE.
 *
 *   A closed vocabulary that does not contain the value the surface's most
 *   visible rule depends on is not a closed vocabulary.
 */
describe('the language barrier', () => {
  it('hangs entirely on `essential`', () => {
    expect(hasLanguageBarrier(profile({ dependency: LanguageDependency.ESSENTIAL }))).toBe(true);
    expect(hasLanguageBarrier(profile({ dependency: LanguageDependency.HELPFUL }))).toBe(false);
    expect(hasLanguageBarrier(profile({ dependency: LanguageDependency.NONE }))).toBe(false);
  });

  it('tells "barrier-free for anyone" apart from "followable by me"', () => {
    // Two different questions: search's "no language barrier" filter depends on
    // NO viewer at all.
    expect(isLanguageNeutral(profile({ dependency: LanguageDependency.NONE }))).toBe(true);
    expect(isLanguageNeutral(profile({ dependency: LanguageDependency.HELPFUL }))).toBe(false);
  });
});

/**
 * PROTECTED INVARIANT
 *   "Followable" is decided on the languages I understand, and `helpful` stays
 *   followable without them — that is the whole point of the middle value.
 */
describe('"can this show be followed?"', () => {
  it('is always yes when language does not matter', () => {
    const dance = profile({ spoken: [], dependency: LanguageDependency.NONE });
    expect(isUnderstandable(dance, [])).toBe(true);
    expect(isUnderstandable(dance, ['ja'])).toBe(true);
  });

  it('is yes when I understand the performed language', () => {
    expect(isUnderstandable(profile(), ['fr'])).toBe(true);
    expect(isUnderstandable(profile(), ['FR'])).toBe(true); // case does not matter
  });

  it('is yes when subtitles cover me', () => {
    expect(isUnderstandable(profile({ subtitles: ['en'] }), ['en'])).toBe(true);
    expect(isUnderstandable(profile({ surtitles: ['de'] }), ['de'])).toBe(true);
  });

  it('is NO when the language is essential and nothing covers me', () => {
    // The case that justifies the rule's existence: a theatre text performed in
    // French, subtitled in English, for a viewer who reads neither.
    expect(isUnderstandable(profile({ subtitles: ['en'] }), ['ja'])).toBe(false);
  });

  it('stays YES when the language is only `helpful`', () => {
    const opera = profile({ dependency: LanguageDependency.HELPFUL, subtitles: ['en'] });
    expect(isUnderstandable(opera, ['ja'])).toBe(true);
  });
});
