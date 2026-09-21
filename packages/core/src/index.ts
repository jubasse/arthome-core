/**
 * `@arthome/core` — le domaine Arthome.
 *
 * ⚠ CETTE ENTREE N'IMPORTE PAS ZOD, A AUCUNE PROFONDEUR.
 *
 * C'est la decision structurante du paquet, et elle se verifie :
 * `tools/check-core-entry.mjs` refuse tout chemin d'import menant a zod depuis
 * ici. Les schemas de frontiere vivent dans `@arthome/core/schema`, et c'est la
 * seule entree qui en depend.
 *
 * Le motif est mesure (D-012) : le cout de zod est FIXE et lie a l'import, pas
 * marginal et lie au nombre de schemas — 93 Ko compresses pour un seul
 * `z.string()` en entree classique. Si cette entree importait zod, aucune
 * entree sans barillet de `@arthome/contracts` ne pourrait rattraper la
 * facture sur la surface la plus contrainte du projet.
 */

// Vague 1 — le socle.
export * from './kernel/index.js';
export * from './vocabulary/index.js';
export * from './money/index.js';
export * from './time/index.js';

// Vague 2 — ce qui se lit et ce qui s'affiche.
export * from './taxonomy/index.js';
export * from './media/index.js';
export * from './format/index.js';
export * from './i18n/index.js';

// Vague 3 — ce qui est publie, ce qui se rediffuse, ce qui est permis.
export * from './catalog/index.js';
export * from './replay/index.js';
export * from './permissions/index.js';
