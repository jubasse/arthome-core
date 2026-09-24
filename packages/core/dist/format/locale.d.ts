/**
 * The locale is an ARGUMENT, never a global.
 *
 * `helpers.js` holds `let locale` at module level, with a `setLocale()`. In a
 * mockup that is convenient. In a package imported by seven services, two
 * concurrent requests would share the same language — a French viewer would get
 * the response formatted for an English speaker because another request changed
 * the global in the meantime.
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
 * Choosing between bilingual content: the READER's language when it exists, the
 * other one otherwise.
 *
 * This is `helpers.js`'s `content()` rule, ported as it stands — it is right.
 * The point it does not make, and the contract adds: a show's PERFORMED
 * language is stated elsewhere (`spokenLanguages`); it has nothing to do with
 * the display language.
 */
export interface Bilingual {
    readonly fr: string;
    readonly en: string;
}
export declare function pickLanguage(value: Bilingual, locale: Locale): string;
//# sourceMappingURL=locale.d.ts.map