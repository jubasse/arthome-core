/**
 * The taxonomy: universes, disciplines, sub-genres, tags, attribute groups — the TYPES and the
 * RULES. The authoritative vocabulary and counts are in `prototypes/shared/taxonomy.json`.
 *
 * The data is served as an immutable versioned artefact, `/taxonomy/{locale}/v{N}.json`: at 59.5 KB
 * raw and 8.4 KB gzip it is not a constant to compile into a package five applications embed.
 */
/** A universe: NAVIGATION ONLY, never a taxonomic level. */
export interface Family {
    readonly id: string;
    readonly i18nKey: string;
}
/** A sub-genre: optional, MULTIPLE, closed vocabulary. */
export interface Genre {
    readonly id: string;
    readonly i18nKey: string;
    /** Tags suggested by this sub-genre. A suggestion, never a rule. */
    readonly suggests: readonly string[];
}
/**
 * A discipline: mandatory, single, closed vocabulary — and a FORM, never a language, a period or a
 * country (B2).
 */
export interface Discipline {
    readonly id: string;
    readonly familyId: string;
    readonly i18nKey: string;
    /**
     * The EDITORIAL RANK, from the most popular to the most specialised, families mixed.
     *
     * No surface reorders: recomputing it on five surfaces would produce five orders.
     */
    readonly rank: number;
    /** The badge's hue. Presentation, carried here because it is served. */
    readonly hue: number;
    readonly genres: readonly Genre[];
}
export interface Tag {
    readonly id: string;
    readonly i18nKey: string;
    /** STYLE · FORM · FORMAT · CONTEXT · AUDIENCE · EDITORIAL */
    readonly category: string;
    readonly aliases: readonly string[];
}
/** A facetable attribute group: `audience`, `accessibility`, … */
export interface AttributeGroup {
    readonly id: string;
    readonly values: readonly AttributeValue[];
}
export interface AttributeValue {
    readonly id: string;
    readonly i18nKey: string;
}
/** The complete artefact, as served and as embedded at build time. */
export interface Taxonomy {
    readonly version: number;
    readonly families: readonly Family[];
    readonly disciplines: readonly Discipline[];
    readonly tags: readonly Tag[];
    readonly attributeGroups: readonly AttributeGroup[];
}
/**
 * A show's taxonomic reference. E9, against `catalogue.json`: the sub-genre is MULTIPLE, and
 * `attributes` in fact carried tags, group by group — "wheelchair accessible" is `accessibility`.
 */
export interface TaxonomyRef {
    readonly disciplineId: string;
    readonly genreIds: readonly string[];
    readonly tagIds: readonly string[];
    readonly attributes: Readonly<Record<string, readonly string[]>>;
}
//# sourceMappingURL=types.d.ts.map