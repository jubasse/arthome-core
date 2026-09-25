/**
 * A show's language: what is performed, subtitled, surtitled — and whether you can follow without
 * understanding.
 *
 * D1: the real vocabulary is `none | helpful | essential`. `taxonomy.json` declared
 * `none | light | helpful`, yet `essential` was what the surface's most visible rule tested and
 * `light` was used nowhere.
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
/** Is there a language barrier? It hangs entirely on `essential` (D1). */
export declare function hasLanguageBarrier(profile: LanguageProfile): boolean;
/** Can this show be followed with the languages I understand? `helpful` stays followable. */
export declare function isUnderstandable(profile: LanguageProfile, understoodLanguages: readonly string[]): boolean;
/** Is the show barrier-free for ANYONE AT ALL? Unlike `isUnderstandable`, depends on no viewer. */
export declare function isLanguageNeutral(profile: LanguageProfile): boolean;
//# sourceMappingURL=language.d.ts.map