// @arthome/tooling/vitest
//
// ⚠ CE MODULE N'IMPORTE RIEN DE `vitest`, ET NE DOIT JAMAIS LE FAIRE.
//
// Il exporte un OBJET NU, que le depot passe a SON PROPRE `defineConfig` :
//
//     import { defineConfig } from 'vitest/config';   // la version du depot
//     import base from '@arthome/tooling/vitest';
//     export default defineConfig({ ...base, test: { ...base.test, /* local */ } });
//
// La raison est la fracture des versions : Angular 22 epingle `vitest ^4.0.8`,
// les cinq autres depots sont sur `5.0.1`. Si ce fichier importait `defineConfig`
// depuis `vitest`, il imposerait UNE version de Vitest aux sept depots et
// casserait les deux depots Angular. Un objet nu n'impose rien : `vitest`
// n'apparait ni en dependencies ni en peerDependencies de @arthome/tooling.
// Le paquet decrit la configuration ; il ne fournit pas l'outil.
//
// Voir architecture/code-conventions.md sections 4.2 et 4.3.

/**
 * Fragment de configuration Vitest commun aux sept depots.
 * Compatible Vitest 4 et 5 : aucune cle propre a l'un des deux.
 */
export const base = {
  test: {
    // Le test est A COTE du fichier qu'il teste. Pas de dossier __tests__, pas
    // d'arborescence test/ parallele : une arborescence parallele finit toujours
    // par diverger de celle qu'elle double — c'est E2 sous un autre visage.
    include: ['src/**/*.spec.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],

    // `.spec.ts` et non `.test.ts` : c'est ce qu'Angular impose, et aligner les
    // cinq autres coute zero.
    globals: false,
    clearMocks: true,
    restoreMocks: true,

    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Pas de seuil chiffre : sur un projet solo, un seuil global produit des
      // tests ecrits pour le chiffre. Ce qui est exige est cible — les bornes
      // des modules de @arthome/core/domain — et c'est definition-of-done.md
      // qui a le dernier mot. Voir code-conventions.md section 5.8.
      exclude: ['**/*.spec.{ts,tsx}', '**/generated/**', '**/dist/**'],
    },
  },
};

export default base;
