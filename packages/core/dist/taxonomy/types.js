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
export {};
//# sourceMappingURL=types.js.map