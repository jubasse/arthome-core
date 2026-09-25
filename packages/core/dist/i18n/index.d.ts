/**
 * i18n: the keys and the reference catalogue, never the sentences.
 *
 * C6 — compiling the dictionaries in at build time is no longer enough, because fixing a typo on
 * mobile or TV would wait for a store review. An immutable versioned artefact serves updates on top
 * over a CDN, and each application embeds a build-time snapshot as a mandatory fallback.
 *
 * ⚠ No service owns this catalogue (`context-map.md` §1.8): it has no invariant, no transaction and
 * no event, and a service that serves a static file is a service to operate for nothing.
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
 * A message key: `<domain>.<path>`. A branded `string` rather than a union of the 1,126 real keys,
 * which would make adding copy a version change of the domain.
 */
export type MessageKey = string;
export declare function messageKey(raw: string): MessageKey;
export declare function domainOf(key: MessageKey): MessageDomain | null;
/**
 * The key of an enumeration member: `enums.<type>.<value>`. The surfaces concatenated by hand and
 * produced `enums.moderationState.published` against `catalogue.messageStates.ok` — two keys for
 * one state (E3).
 */
export declare function enumKey(vocabulary: string, member: string): MessageKey;
/**
 * The catalogue version served to a surface, carried by the bootstrap. It never blocks the first
 * render — the embedded snapshot is enough — which `storefront-tv` requires: there is an instant
 * when the TV knows neither the profile, nor the language, nor the labels.
 */
export interface LabelCatalogRef {
    /**
     * ⚠ Open, and owned by `backend-contracts`: `MESSAGE_DOMAINS` is expressible nowhere in either
     * contract. The served `labelCatalog` carries `{ locale, version, url }`, so the domain survives
     * only inside the URL and a client must take a string apart to recover it — the one real gap the
     * inverse check found, not a deliberate domain-only member.
     */
    readonly domain: MessageDomain;
    readonly locale: string;
    readonly version: number;
    readonly url: string;
}
//# sourceMappingURL=index.d.ts.map