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
/** The five copy domains, split so the embedded snapshot stays small. */
export declare const MESSAGE_DOMAINS: readonly ["common", "storefront", "studio", "taxonomy", "system"];
export type MessageDomain = (typeof MESSAGE_DOMAINS)[number];
export declare const MessageDomain: {
    readonly COMMON: "common";
    readonly STOREFRONT: "storefront";
    readonly STUDIO: "studio";
    readonly TAXONOMY: "taxonomy";
    readonly SYSTEM: "system";
};
/**
 * A message key: `<domain>.<path>`.
 *
 * The type stays a branded `string` rather than a union of the 1,126 real keys:
 * freezing them into the package would make adding copy a version change of the
 * domain, which is exactly what the dynamic catalogue exists to avoid.
 */
export type MessageKey = string;
export declare function messageKey(raw: string): MessageKey;
export declare function domainOf(key: MessageKey): MessageDomain | null;
/**
 * The key of an enumeration member: `enums.<type>.<value>`.
 *
 * It is the package's only key factory, and it exists for a precise reason: the
 * surfaces resolved enumeration labels by concatenating by hand, which produced
 * `enums.moderationState.published` on one side and
 * `catalogue.messageStates.ok` on the other — two keys for one state (E3).
 */
export declare function enumKey(vocabulary: string, member: string): MessageKey;
/**
 * The catalogue version served to a surface, carried by the bootstrap.
 *
 * It NEVER blocks the first render: the embedded snapshot is enough, and the
 * served catalogue is layered on afterwards. `storefront-tv` makes it a
 * requirement — there is an instant, before the first response, when the TV
 * knows neither the profile, nor the language, nor the labels.
 */
export interface LabelCatalogRef {
    /**
     * ⚠ THE INVERSE CHECK'S ONE OPEN ITEM, AND MY ANSWER IS THAT IT SHOULD BE
     * SERVED RATHER THAN EXEMPTED.
     *
     * `MESSAGE_DOMAINS` is expressible nowhere in either contract: the served
     * `labelCatalog` carries `{ locale, version, url }` and the theme survives
     * only INSIDE the URL — `/i18n/studio/fr/v41.json`. So a client that wants to
     * know which theme it holds must parse a path to recover it.
     *
     * That is the `imageUrl(kind, key, width)` fault in another costume: a value
     * recoverable only by taking a string apart is a value the contract did not
     * serve. It costs one field to fix and it removes a parse from every client
     * that caches catalogues by theme.
     *
     * So I am NOT claiming this member as deliberately domain-only. It is the one
     * place where the inverse check found a real gap rather than an internal
     * vocabulary, and it belongs to `backend-contracts`.
     */
    readonly domain: MessageDomain;
    readonly locale: string;
    readonly version: number;
    readonly url: string;
}
//# sourceMappingURL=index.d.ts.map