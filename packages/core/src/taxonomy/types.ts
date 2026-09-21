/**
 * La taxonomie : 2 univers, 21 disciplines, 176 sous-genres, 205 etiquettes,
 * 7 groupes d'attributs.
 *
 * ⚠ CE MODULE NE PORTE PAS LA DONNEE. La taxonomie est servie comme un
 * ARTEFACT VERSIONNE IMMUABLE — `/taxonomy/{locale}/v{N}.json` — par langue et
 * par surface, avec un cache tres long et un instantane embarque au build
 * comme repli. 59,5 Ko bruts, 8,4 Ko gzip : ce n'est pas un appel d'API, et
 * encore moins une constante compilee dans un paquet que cinq applications
 * embarquent.
 *
 * Ce module porte les TYPES et les REGLES. Le chargement est la ou vit
 * l'artefact.
 */

/** Un univers : NAVIGATION SEULEMENT, jamais un niveau taxonomique. */
export interface Family {
  readonly id: string;
  readonly i18nKey: string;
}

/** Un sous-genre : optionnel, MULTIPLE, vocabulaire ferme. */
export interface Genre {
  readonly id: string;
  readonly i18nKey: string;
  /** Etiquettes suggerees par ce sous-genre. Une suggestion, jamais une regle. */
  readonly suggests: readonly string[];
}

/**
 * Une discipline : obligatoire, unique, vocabulaire ferme.
 *
 * Une discipline est une FORME — jamais une langue, une epoque ni un pays.
 * C'est la distinction que `Taxonomie - projet.md` s'emploie a prevenir, et que
 * le cahier des charges TV avait perdue en appelant « concerts » une discipline
 * et « ballet » autre chose qu'un sous-genre de la danse (B2).
 */
export interface Discipline {
  readonly id: string;
  readonly familyId: string;
  readonly i18nKey: string;
  /**
   * Le RANG EDITORIAL, du plus grand public au plus pointu, familles melees.
   *
   * ⚠ AUCUNE SURFACE NE REORDONNE. C'est une decision editoriale, servie avec
   * la taxonomie ; la recalculer sur cinq surfaces produirait cinq ordres.
   */
  readonly rank: number;
  /** Teinte de la pastille. Presentation, portee ici parce que servie. */
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

/** Un groupe d'attributs facetables : `audience`, `accessibility`, … */
export interface AttributeGroup {
  readonly id: string;
  readonly values: readonly AttributeValue[];
}

export interface AttributeValue {
  readonly id: string;
  readonly i18nKey: string;
}

/** L'artefact complet, tel qu'il est servi et tel qu'il est embarque au build. */
export interface Taxonomy {
  readonly version: number;
  readonly families: readonly Family[];
  readonly disciplines: readonly Discipline[];
  readonly tags: readonly Tag[];
  readonly attributeGroups: readonly AttributeGroup[];
}

/**
 * La reference taxonomique d'un spectacle.
 *
 * E9 — TROIS corrections par rapport a `catalogue.json` :
 *   - le sous-genre est MULTIPLE. `taxonomy.json` le declare « optionnel,
 *     multiple », `catalogue.json` le porte au singulier, et le filtre de
 *     recherche du web est une multi-selection. Le pluriel tranche ;
 *   - `attributes` portait en realite des ETIQUETTES — `revival`,
 *     `new-creation`, `opening-night`, `open-air`, `archive` sont des tags au
 *     sens de `tagPolicy`, pas des valeurs des sept groupes d'attributs.
 *     Collision de nom entre deux notions : elles sont separees ici ;
 *   - les attributs sont un enregistrement groupe par groupe, pas une liste
 *     plate : « accessible en fauteuil » appartient a `accessibility`, et le
 *     savoir est ce qui permet d'en faire une facette.
 */
export interface TaxonomyRef {
  readonly disciplineId: string;
  readonly genreIds: readonly string[];
  readonly tagIds: readonly string[];
  readonly attributes: Readonly<Record<string, readonly string[]>>;
}
