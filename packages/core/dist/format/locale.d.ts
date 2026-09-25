/**
 * The locale is an ARGUMENT, never a global: `helpers.js` held `let locale` at module level, and in
 * a package imported by seven services two concurrent requests would share the same language.
 */
/** The product's two languages. BCP 47, short form. */
export declare const LOCALES: readonly ["fr", "en"];
export type Locale = (typeof LOCALES)[number];
export declare const Locale: {
    readonly FR: "fr";
    readonly EN: "en";
};
export declare function parseLocale(raw: string): Locale;
/**
 * Choosing between bilingual content: the READER's language when it exists, the other one
 * otherwise. This is the DISPLAY language; a show's performed language is `spokenLanguages`.
 */
export interface Bilingual {
    readonly fr: string;
    readonly en: string;
}
export declare function pickLanguage(value: Bilingual, locale: Locale): string;
//# sourceMappingURL=locale.d.ts.map