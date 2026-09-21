// arthome-core — configuration ESLint du depot.
//
// La forme est la meme sur les sept depots, et l'ordre est la seule chose qui ne
// se negocie pas :
//   1. le socle commun (@arthome/tooling)
//   2. la pile, qui peut rallumer des choses  ← aucune ici : arthome-core est du
//      TypeScript pur, sans framework (README section 3)
//   3. les surcharges locales, chacune avec sa raison
//   4. eslint-config-prettier/flat, DERNIER
//
// `npx eslint-config-prettier <fichier>` verifie que 4 a bien tout eteint.
// Voir architecture/code-conventions.md sections 3.2 et 4.3.

import { defineConfig, globalIgnores } from 'eslint/config';
import node from '@arthome/tooling/eslint/node';
import prettier from 'eslint-config-prettier/flat';

export default defineConfig([
  globalIgnores([
    'packages/*/dist/**',
    'prototypes/**', // les cinq maquettes : reprises telles quelles, pas reecrites
    'docs/**',
  ]),

  // 1. le socle. arthome-core s'execute sous Node (construction, outillage,
  //    fixtures) : c'est l'entree `node` et non `browser`.
  ...node,

  // 3. surcharges locales
  {
    // Les portes de @arthome/tooling sont des scripts Node autonomes : elles
    // n'ont pas de projet TypeScript, et elles ecrivent sur la sortie standard —
    // c'est leur travail.
    files: ['packages/tooling/bin/**/*.mjs', 'packages/tooling/*.js', 'packages/tooling/eslint/*.js'],
    rules: {
      'no-console': 'off',
    },
  },

  // 4. DERNIER
  prettier,
]);
