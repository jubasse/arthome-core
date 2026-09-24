/**
 * A show's language: what is performed, subtitled, surtitled — and whether you
 * can follow without understanding.
 *
 * D1 — THE MOST VERIFIABLE CORRECTION IN THE FILE. `taxonomy.json` declares the
 * vocabulary `none | light | helpful`. But:
 *   - `essential` is ABSENT from the vocabulary and used by five shows;
 *   - it is translated in `i18n/storefront.json`;
 *   - and `helpers.js:437` MAKES IT ITS TEST: `languageDependency(show) === 'essential'`;
 *   - while `light` is used NOWHERE.
 *
 * A closed vocabulary that does not contain the value the surface's most
 * visible rule depends on is not a closed vocabulary. The real vocabulary is
 * `none | helpful | essential`, and it is corrected at porting time.
 */
import { LanguageDependency } from '../vocabulary/catalog.js';
/** The INGREDIENTS. The sentence is composed at the surface, in its language. */
export interface LanguageProfile {
    /** BCP 47 codes of the language PERFORMED — distinct from the display language. */
    readonly spoken: readonly string[];
    readonly subtitles: readonly string[];
    readonly surtitles: readonly string[];
    readonly dependency: LanguageDependency;
}
/**
 * Is there a language barrier?
 *
 * `helpers.hasLanguageBarrier`'s test, ported as it stands — it is the
 * surface's most visible rule, and it hangs entirely on `essential`.
 */
export declare function hasLanguageBarrier(profile: LanguageProfile): boolean;
/**
 * Can this show be followed with the languages I understand?
 *
 * Three paths, in this order:
 *   - language does not matter (`none`): yes, always;
 *   - I understand the performed language: yes;
 *   - subtitles or surtitles cover me: yes.
 * Otherwise the answer depends on the dependency — `helpful` stays followable,
 * which is the whole point of the middle value.
 */
export declare function isUnderstandable(profile: LanguageProfile, understoodLanguages: readonly string[]): boolean;
/**
 * Is the show barrier-free for ANYONE AT ALL?
 *
 * Serves search's "no language barrier" filter, which is not the same question
 * as `isUnderstandable`: this one depends on no viewer.
 */
export declare function isLanguageNeutral(profile: LanguageProfile): boolean;
//# sourceMappingURL=language.d.ts.map