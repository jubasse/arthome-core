/**
 * The locale is an ARGUMENT, never a global.
 *
 * `helpers.js` holds `let locale` at module level, with a `setLocale()`. In a
 * mockup that is convenient. In a package imported by seven services, two
 * concurrent requests would share the same language — a French viewer would get
 * the response formatted for an English speaker because another request changed
 * the global in the meantime.
 */
import { DomainError } from '../kernel/errors.js';
/** The product's two languages. BCP 47, short form. */
export const LOCALES = ['fr', 'en'];
export const Locale = {
    FR: 'fr',
    EN: 'en',
};
export function parseLocale(raw) {
    const head = raw.toLowerCase().split('-')[0] ?? '';
    return LOCALES.includes(head) ? head : Locale.FR;
}
export function pickLanguage(value, locale) {
    const preferred = locale === Locale.FR ? value.fr : value.en;
    const fallback = locale === Locale.FR ? value.en : value.fr;
    const chosen = preferred.length > 0 ? preferred : fallback;
    if (chosen.length === 0) {
        throw new DomainError({ code: 'content.empty_in_both_languages' });
    }
    return chosen;
}
//# sourceMappingURL=locale.js.map