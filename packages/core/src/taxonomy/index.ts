/** La taxonomie : types, rang editorial, resolution d'un terme. */

export type {
  AttributeGroup,
  AttributeValue,
  Discipline,
  Family,
  Genre,
  Tag,
  Taxonomy,
  TaxonomyRef,
} from './types.js';

export type { TermMatch } from './lookup.js';
export {
  disciplinesInEditorialOrder,
  disciplinesOfFamily,
  findDiscipline,
  findGenre,
  findTag,
  genreIdsOf,
  matchesTag,
  resolveTerm,
} from './lookup.js';
