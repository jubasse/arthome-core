/**
 * i18n: the KEYS and the reference catalogue. **Never the sentences.**
 *
 * C6 — the model changed mid-project. `i18n-compile.js` compiled the
 * dictionaries into each surface at build time; that stays true and is no
 * longer enough, because fixing a typo on mobile or on TV would mean waiting
 * for a store review.
 *
 * The model adopted, and this module is its stable half:
 *   - `core` keeps the KEYS and the reference catalogue;
 *   - an IMMUTABLE VERSIONED artefact serves updates on top,
 *     `/{surface}/{locale}/v{N}.json`, over a CDN;
 *   - each application embeds a BUILD-TIME SNAPSHOT as a mandatory fallback —
 *     never a raw code on screen if the service is unavailable.
 *
 * ⚠ NO SERVICE OWNS THIS CATALOGUE (`context-map.md` §1.8). It has no
 * invariant, no transaction and no event: it is a static file, and a service
 * that serves a static file is a service to operate for nothing.
 */
import { DomainError } from '../kernel/errors.js';
/** The five copy domains, split so the embedded snapshot stays small. */
export const MESSAGE_DOMAINS = ['common', 'storefront', 'studio', 'taxonomy', 'system'];
export const MessageDomain = {
    COMMON: 'common',
    STOREFRONT: 'storefront',
    STUDIO: 'studio',
    TAXONOMY: 'taxonomy',
    SYSTEM: 'system',
};
const KEY_SHAPE = /^[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9][a-zA-Z0-9-]*)+$/;
export function messageKey(raw) {
    if (!KEY_SHAPE.test(raw)) {
        throw new DomainError({ code: 'i18n.key_malformed', params: { key: raw } });
    }
    return raw;
}
export function domainOf(key) {
    const head = key.split('.')[0] ?? '';
    return MESSAGE_DOMAINS.includes(head) ? head : null;
}
/**
 * The key of an enumeration member: `enums.<type>.<value>`.
 *
 * It is the package's only key factory, and it exists for a precise reason: the
 * surfaces resolved enumeration labels by concatenating by hand, which produced
 * `enums.moderationState.published` on one side and
 * `catalogue.messageStates.ok` on the other — two keys for one state (E3).
 */
export function enumKey(vocabulary, member) {
    return messageKey(`enums.${vocabulary}.${member}`);
}
//# sourceMappingURL=index.js.map