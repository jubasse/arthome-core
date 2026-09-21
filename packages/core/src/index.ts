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

export * from './kernel/index.js';
export * from './vocabulary/index.js';
export * from './money/index.js';
export * from './time/index.js';
