/**
 * The taxonomy: universes, disciplines, sub-genres, tags, attribute groups.
 *
 * ⚠ THE AUTHORITATIVE COUNTS AND THE VOCABULARY ARE IN
 * `prototypes/shared/taxonomy.json`, and nowhere else. This comment deliberately
 * states no figure: `docs/taxonomy.md`'s tag list is ILLUSTRATIVE (196 of 205),
 * and a count written here would be a parallel table on the one thing this
 * module exists to keep single.
 *
 * ⚠ THIS MODULE DOES NOT CARRY THE DATA. The taxonomy is served as an
 * IMMUTABLE VERSIONED ARTEFACT — `/taxonomy/{locale}/v{N}.json` — per language
 * and per surface, with a very long cache and a build-time snapshot as a
 * fallback. 59.5 KB raw, 8.4 KB gzip: that is not an API call, and still less a
 * constant compiled into a package five applications embed.
 *
 * This module carries the TYPES and the RULES. Loading happens where the
 * artefact lives.
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
 * A discipline: mandatory, single, closed vocabulary.
 *
 * A discipline is a FORM — never a language, a period or a country. That is the
 * distinction `docs/taxonomy.md` works to protect, and which the TV brief
 * had lost by calling "concerts" a discipline and "ballet" something other than
 * a sub-genre of dance (B2).
 */
export interface Discipline {
  readonly id: string;
  readonly familyId: string;
  readonly i18nKey: string;
  /**
   * The EDITORIAL RANK, from the most popular to the most specialised,
   * families mixed.
   *
   * ⚠ NO SURFACE REORDERS. It is an editorial decision, served with the
   * taxonomy; recomputing it on five surfaces would produce five orders.
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
 * A show's taxonomic reference.
 *
 * E9 — THREE corrections against `catalogue.json`:
 *   - the sub-genre is MULTIPLE. `taxonomy.json` declares it "optional,
 *     multiple", `catalogue.json` carries it in the singular, and the web
 *     search filter is a multi-select. The plural wins;
 *   - `attributes` in fact carried TAGS — `revival`, `new-creation`,
 *     `opening-night`, `open-air`, `archive` are tags in `tagPolicy`'s sense,
 *     not values of the seven attribute groups. A name collision between two
 *     notions: they are separated here;
 *   - attributes are a record group by group, not a flat list: "wheelchair
 *     accessible" belongs to `accessibility`, and knowing that is what makes it
 *     a facet.
 */
export interface TaxonomyRef {
  readonly disciplineId: string;
  readonly genreIds: readonly string[];
  readonly tagIds: readonly string[];
  readonly attributes: Readonly<Record<string, readonly string[]>>;
}
